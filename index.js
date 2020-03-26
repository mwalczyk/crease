import { PlanarGraph } from './graph.js';
import { Vec2 } from './math.js';
import { SelectionGroup } from './selection_group.js';
import { calculateTriangleIncenter, calculatePerpendicular } from './geometry.js';

const snapsvg = require('snapsvg');

// To install:
// 
// 1) First, in this directory run:
//
// 		npm init
// 		npm install snapsvg
//
// 2) Then, globally run:
//
// 		npm install -g browserify
// 		npm install -g watchify
//		npm install --save-dev babelify @babel/core
//		npm install --save-dev @babel/preset-env
//
// Some references:
//
// 		[1](http://svg.dabbles.info/snaptut-dragscale)
//		[2](https://github.com/adobe-webplatform/Snap.svg/issues/420)
//		[3](https://gist.github.com/osvik/0185cb4381b35aad3d3e1f5438ca5ca4#create-objects-with-snap)
//		[4](https://www.w3schools.com/colors/colors_picker.asp)
//		[5](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
//		[6](https://www.sohamkamani.com/blog/2017/08/21/enums-in-javascript/)
//		[7](https://gist.github.com/osvik/0185cb4381b35aad3d3e1f5438ca5ca4)
// 		[8](https://www.abcdinamo.com/typefaces/whyte)
//
//	Math stuff:
//
// 		[1](https://stackoverflow.com/questions/1811549/perpendicular-on-a-line-from-a-given-point)
//		[2](https://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect)
//		[3](https://www.mathopenref.com/coordincenter.html)
//
// To run:
//
// 		watchify index.js -o bundle.js
//

// An embedding of a planar graph, representing the crease pattern
let g = new PlanarGraph();

// Create the `Element` object that will house all of the other SVGs
console.log('Starting application...');
const s = Snap('#svg');
const w = s.attr().width;
const h = s.attr().height;
console.log(`SVG size: ${w} x ${h}`);

document.addEventListener('keydown', function(event) {
    if (event.keyCode == 13) {
    	console.log(g.edges);
    }
});


const creaseAssignment = {
	MOUNTAIN: 'm',
	VALLEY: 'v',
	BORDER: 'b'
};

const vertexType = {
	GRID: 'grid',
	ACTIVE: 'active'
};

const creaseType = {
	GRID: 'grid',
	ACTIVE: 'active'
};

const tools = {
	LINE_SEGMENT: 'line-segment',
	LINE: 'line',
	INCENTER: 'incenter',
	PERPENDICULAR: 'perpendicular'
};

let selectionGroups = {
	'line-segment': new SelectionGroup(2, 0),
	'line': new SelectionGroup(2, 0),
	'incenter': new SelectionGroup(3, 0),
	'perpendicular': new SelectionGroup(1, 1)
};

const selectionModes = {
	VERTEX: 'vertex',
	CREASE: 'crease'
};

// Configuration for application start
let select = selectionModes.VERTEX;
let tool = tools.LINE_SEGMENT;
let gridDivsX = 5;
let gridDivsY = 5;
const vertexDrawRadius = 4;
const creaseStrokeWidth = 4;

function deselectAllVertices() {
	s.selectAll('.vertex').forEach(el => el.removeClass('vertex-selected'));
}

function deselectAllCreases() {
	s.selectAll('.crease').forEach(el => el.removeClass('crease-selected'));
}

function deselectAll() {
	deselectAllVertices()
	deselectAllCreases()
}

// Applies a cyclic animation to a particular attribute of an SVG DOM element
// 
// For example, you could quickly increase (then decrease) the radius of a circle
function animateCycle(el, name, to, from, timeTo=200, timeFrom=200) {
	let anims = [
		function() {
			Snap.animate(from, to, function(val) { el.attr(name, val);  }, 200, mina.elastic, anims[1]); 
		},
		function() {
			Snap.animate(to, from, function(val) { el.attr(name, val); }, 50, mina.bounce);
		}
	];
	anims[0]();		
}

function setSelectionMode(selectionMode, animate=true) {
	console.log(`Switching to selection mode: ${selectionMode}`);
	select = selectionMode;

	if (animate) {
		switch (selectionMode) {
			case selectionModes.VERTEX:
				s.selectAll('.vertex').forEach(el => animateCycle(el, 'r', vertexDrawRadius * 1.2, vertexDrawRadius));
				break;
			case selectionModes.CREASE:
				s.selectAll('.crease').forEach(el => animateCycle(el, 'strokeWidth', creaseStrokeWidth * 1.2, creaseStrokeWidth));
				break;
		}
	}
}

// Crease callback functions
let callbackCreaseClicked = function() {
	if (select === selectionModes.CREASE) {
		deselectAllCreases();

		if (tool === tools.PERPENDICULAR) {

			if (selectionGroups[tool].maybeAddCrease(this)) {
				this.addClass('crease-selected');
				if (selectionGroups[tool].hasRequiredCreases) {
					// Grab the start / end points of the selected crease, and convert them to vectors
					let crease = selectionGroups[tool].creases[0];
					const lineA = new Vec2(crease.attr().x1, crease.attr().y1);
					const lineB = new Vec2(crease.attr().x2, crease.attr().y2);

					// Grab the (previously) selected vertex, and convert it to a vector
					let vertex = selectionGroups[tool].vertices[0];
					let point = new Vec2(vertex.getBBox().cx, vertex.getBBox().cy);

					// Calculate the point along the infinite line defined by the crease that is perpendicular
					let perp = calculatePerpendicular(lineA, lineB, point);

					// Add the new vertex
					let perpVertex = drawVertex(perp.x, perp.y, vertexType.ACTIVE);

					drawCrease(vertex, perpVertex);
				}

				// Reset the selection mode
				if (selectionGroups[tool].verticesFirst) {
					setSelectionMode(selectionModes.VERTEX);
				}

				selectionGroups[tool].clear();
				deselectAll(); 
			}

		}
	
	}
}

let callbackCreaseDoubleClicked = function() {
	// TODO: figure out how to do this by cycling through the object keys
	if (this.hasClass('mountain')) {
		this.removeClass('mountain');
		this.addClass('valley');
	} else if (this.hasClass('valley')) {
		this.removeClass('valley');
		this.addClass('mountain');
	} else {
		this.addClass('mountain');
	}
}

// function drawCrease(x0, y0, x1, y1) {
// 	const label = Snap.parse(`<title>Edge: ${g.edges.length}</title>`);

// 	let crease = s.line(x0, y0, x1, y1);
// 	crease.data('index', g.edges.length);
// 	crease.click(callbackCreaseClicked);
// 	crease.dblclick(callbackCreaseDoubleClicked);
// 	crease.addClass('crease');
// 	crease.append(label);

// 	return crease;
// }

// Adds a crease (an SVG line element) between the center points of the two specified SVG elements
function drawCrease(elA, elB) {
	const label = Snap.parse(`<title>Edge: ${g.edges.length}, Connects Vertices: ${elA.data('index')}, ${elB.data('index')}</title>`);
	const vertices = s.selectAll('.vertex');

	let crease = s.line(
		elA.getBBox().cx,
		elA.getBBox().cy,
		elB.getBBox().cx,
		elB.getBBox().cy
	);
	crease.addClass('crease');
	crease.data('index', g.edges.length);
	crease.click(callbackCreaseClicked);
	crease.dblclick(callbackCreaseDoubleClicked);
	crease.append(label);

	// Always draw creases "behind" the existing vertices
	crease.insertBefore(vertices[0]);

	g.addEdge(elA.data('index'), elB.data('index'));

	return crease;
}







// Vertex callback functions
let callbackVertexClicked = function() {

	if (tool === tools.LINE_SEGMENT) {

		if (selectionGroups[tool].maybeAddVertex(this)) {
			this.addClass('vertex-selected');
			if (selectionGroups[tool].isComplete) {
				// Add the new crease
				drawCrease(selectionGroups[tool].vertices[0], selectionGroups[tool].vertices[1]);

				selectionGroups[tool].clear();
				deselectAllVertices();
			} 
		} 

	} else if (tool === tools.LINE) {


	} else if (tool === tools.INCENTER) {

		if (selectionGroups[tool].maybeAddVertex(this)) {
			this.addClass('vertex-selected');
			if (selectionGroups[tool].isComplete) {
				// Convert the selected SVG elements to vectors so that we can operate on them
				let vertices = selectionGroups[tool].vertices.map(el => new Vec2(el.getBBox().cx, el.getBBox().cy));

				// Calculate the incenter of the 3 points
				const incenter = calculateTriangleIncenter(vertices[0], vertices[1], vertices[2]);

				// Add the new vertex
				let elB = drawVertex(incenter.x, incenter.y, vertexType.ACTIVE);

				// Create 3 new creases that join each of the 3 points to their incenter
				selectionGroups[tool].vertices.forEach(elA => drawCrease(elA, elB));

				selectionGroups[tool].clear();
				deselectAllVertices();
			} 
		} 

	} else if (tool === tools.PERPENDICULAR) {

		if (selectionGroups[tool].maybeAddVertex(this)) {
			this.addClass('vertex-selected');
			if (selectionGroups[tool].hasRequiredVertices) {
				setSelectionMode(selectionModes.CREASE);
			} 
		} 

	}

	
}

let callbackVertexHoverEnter = function() {
	this.attr({'r': vertexDrawRadius * 1.5});
}
let callbackVertexHoverExit = function() {
	this.attr({'r': vertexDrawRadius});
}

function findElementWithIndex(selector, index) {
	const elements = Array.from(s.selectAll(selector));
	return elements.find(el => el.data('index') === index);
}

function removeElementWithIndex(selector, index) {
	const maybeElement = findElementWithIndex(selector, index);
	if (maybeElement !== undefined) {
		maybeElement.remove();
		return true;
	}
	return false;
}



function drawVertex(x, y, type) {
	// First, add a new node to the planar graph - this returns the index of either
	// an existing node or a new node
	const [nodeIndex, changedEdgeIndices] = g.addNode(new Vec2(x, y));
	removeElementWithIndex('.vertex', nodeIndex);

	let vertex = s.circle(x, y, vertexDrawRadius);
	vertex.data('type', type);
	vertex.data('index', nodeIndex);
	vertex.addClass('vertex');
	vertex.hover(callbackVertexHoverEnter, callbackVertexHoverExit);
	vertex.click(callbackVertexClicked);
	vertex.append(Snap.parse(`<title>Vertex: ${nodeIndex}</title>`));

	changedEdgeIndices.forEach(edgeIndex => {
		// Remove and re-add them?
	});

	return vertex;
}



function constructGrid() {

	let svgVertices = Array.from(s.selectAll('.vertex'));

	// // Remove all "grid" vertices, keeping any user-generated, "active" vertices in tact
	// TODO
	// var removeIndices = [];
	// for (var index = 0; index < vertices.length; index++) {
	// 	if (vertices[index].data('type') == vertexType.GRID) {
	// 		// Record the index of this vertex so that it can be properly removed from the planar graph
	// 		removeIndices.push(vertices[index].data('index'));
	//
	// 		// Remove the SVG element from the DOM
	// 		vertices[index].remove();
	// 	}
	// }

	// Make sure each of the SVG elements contains the right index
	svgVertices.forEach((v, i) => v.data('index', i));	

	const gridSizeX = w / 2;
	const gridSizeY = h / 2;
	const paperCenterX = gridSizeX;
	const paperCenterY = gridSizeY; 

	for (var y = 0; y < gridDivsY; y++) {
		for (var x = 0; x < gridDivsX; x++) {
			let percentX = x / (gridDivsX - 1);
			let percentY = y / (gridDivsY - 1);
			let posX = percentX * gridSizeX + paperCenterX / 2;
			let posY = percentY * gridSizeY + paperCenterY / 2;
			drawVertex(posX, posY, vertexType.GRID);
		}
	}

	console.log(g.vertices)
}

// Add event listener to grid divisions slider
document.getElementById('divisions').onchange = function() {
    gridDivsX = this.value;
    gridDivsY = this.value;
    constructGrid();
};

// Add event listeners to tool radio buttons
Array.from(document.getElementsByClassName('tools')).forEach(el => {
	el.onclick = function() {
		deselectAll();
		tool = this.value;
		console.log(`Switched to tool: ${tool}`)

		selectionGroups[tool].clear();
		setSelectionMode(selectionGroups[tool].verticesFirst ? selectionModes.VERTEX : selectionModes.CREASE);
	};
});

// Add event listeners to selection mode radio buttons
Array.from(document.getElementsByClassName('selection-modes')).forEach(el => {
	el.onclick = function() {
		deselectAll();
		select = this.value;
	};
});

// Start the application
constructGrid();

