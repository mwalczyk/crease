import { PlanarGraph } from './graph.js';
import { Vec2 } from './math.js';
import { SelectionGroup } from './selection_group.js';
import { calculateTriangleIncenter } from './geometry.js';

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
	BORDER: 'b',
	UNKNOWN: 'u'
};

const vertexType = {
	GRID: 'grid',
	ACTIVE: 'active'
};

const creaseType = {
	GRID: 'grid',
	ACTIVE: 'active'
};

const editModes = {
	LINE_SEGMENT: 'line-segment',
	LINE: 'line',
	INCENTER: 'incenter'
};

let selectionGroups = {
	'line-segment': new SelectionGroup(2, 0),
	'line': new SelectionGroup(2, 0),
	'incenter': new SelectionGroup(3, 0)
};

const selectionModes = {
	VERTEX: 'vertex',
	CREASE: 'crease'
};

// Configuration for application start
let select = selectionModes.VERTEX;
let mode = editModes.LINE_SEGMENT;
let gridDivsX = 5;
let gridDivsY = 5;
const vertexDrawRadius = 6;
let activeCrease = null;



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

// Finds the index of the vertex that is closest to the specified 
// coordinates 
//
// TODO: use `Snap.path.isPointInsideBBox(bbox, x, y)` instead?
function findClosestVertexTo(x, y) {
	// Convert the HTMLCollection into a Javascript array
	const vertices = Array.from(s.selectAll('.vertex'));
	const distances = vertices.map(el => Math.hypot(el.getBBox().cx - x, el.getBBox().cy - y));
	const index = distances.indexOf(Math.min.apply(Math, distances));
	const distance = distances[index];

	return [index, distance];
}

// Crease callback functions
let callbackCreaseClicked = function() {
	if (select === selectionModes.CREASE) {
		deselectAllCreases();
		this.addClass('crease-selected');
	}
}

function addCrease(x0, y0, x1, y1) {
	const label = Snap.parse(`<title>Edge: ${g.edges.length}</title>`);

	let crease = s.line(x0, y0, x1, y1);
	crease.data('index', g.edges.length);
	crease.click(callbackCreaseClicked);
	crease.addClass('crease');
	crease.append(label);

	return crease;
}



// Vertex callback functions
let callbackVertexClicked = function() {

	if (mode === editModes.LINE_SEGMENT) {

		if (selectionGroups[mode].maybeAddVertex(this)) {
			this.addClass('vertex-selected');
			if (selectionGroups[mode].isComplete) {
				addCrease(
						selectionGroups[mode].vertices[0].getBBox().cx, 
						selectionGroups[mode].vertices[0].getBBox().cy, 
						selectionGroups[mode].vertices[1].getBBox().cx, 
						selectionGroups[mode].vertices[1].getBBox().cy
				);

				// Add the new edge to the planar graph
				g.addEdge(selectionGroups[mode].vertices[0].data('index'),
						  selectionGroups[mode].vertices[1].data('index'));

				selectionGroups[mode].clear();
				deselectAllVertices();
			} 
		} 

	} else if (mode === editModes.LINE) {

	} else if (mode === editModes.INCENTER) {

		if (selectionGroups[mode].maybeAddVertex(this)) {
			this.addClass('vertex-selected');
			if (selectionGroups[mode].isComplete) {
				// Convert the selected SVG elements to vectors so that we can operate on them
				let vertices = selectionGroups[mode].vertices.map(el => new Vec2(el.getBBox().cx, el.getBBox().cy));

				// Calculate the incenter of the 3 points
				const incenter = calculateTriangleIncenter(vertices[0], vertices[1], vertices[2]);

				// Add the new vertex
				let vertex = addVertex(incenter.x, incenter.y, vertexType.ACTIVE);

				// Create 3 new creases that join each of the 3 points to their incenter
				vertices.forEach(v => {
					addCrease(
						v.x, 
						v.y, 
						incenter.x,
						incenter.y
					);
				})

				// Add the new edges to the planar graph 
				selectionGroups[mode].vertices.map(el => g.addEdge(el.data('index'), vertex.data('index')));

				selectionGroups[mode].clear();
				deselectAllVertices();
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

function addVertex(x, y, type) {

	const label = Snap.parse(`<title>Vertex: ${g.vertices.length}</title>`);

	let vertex = s.circle(x, y, vertexDrawRadius);
	vertex.data('type', type);
	vertex.data('index', g.vertices.length);
	vertex.hover(callbackVertexHoverEnter, callbackVertexHoverExit);
	vertex.click(callbackVertexClicked);
	vertex.addClass('vertex');
	vertex.append(label);

	g.addVertex(new Vec2(x, y));

	return vertex;
}

// let callbackVertexDragMove = function(dx, dy, x, y) {
// 	activeCrease.attr({
// 		'x2': this.getBBox().cx + dx, 
// 		'y2': this.getBBox().cy + dy
// 	});
// }
// let callbackVertexDragStart = function() {
// 	console.log('Starting drag...')

	
// }
// let callbackVertexDragStop = function() {
// 	console.log('Ending drag...')

// 	const threshold = 20;
// 	const [index, distance] = findClosestVertexTo(
// 		activeCrease.attr().x2,
// 		activeCrease.attr().y2
// 	);

// 	if (distance < threshold && index != this.data('index')) {
// 		console.log(`Connecting to vertex: ${index}`);
// 		const vertices = Array.from(s.selectAll('.vertex'));
// 		activeCrease.attr({
// 			'x2': vertices[index].getBBox().cx,
// 			'y2': vertices[index].getBBox().cy
// 		});

// 		// Add this edge to the planar graph
// 		const a = this.data('index');
// 		const b = index;
// 		g.addEdge(a, b);
// 		console.log(g.edges);

// 	} else {
// 		console.log('Failed to connect line to vertex...deleting');
// 		let activeCrease = creases.pop();
// 		activeCrease.remove();
// 	}
// }




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
			addVertex(posX, posY, vertexType.GRID);
		}
	}

	console.log(g.vertices)
}

const slider = document.getElementById('divisions');
slider.onchange = function() {
    gridDivsX = this.value;
    gridDivsY = this.value;
    constructGrid();
};

const editModeButtons = document.getElementsByClassName('edit-modes');
for (var index = 0; index < editModeButtons.length; index++) {
	editModeButtons[index].onclick = function() {
		deselectAll();
		mode = this.value;
		console.log(`Switched to mode: ${mode}`)

		select = selectionGroups[mode].verticesFirst ? selectionModes.VERTEX : selectionModes.CREASE;
	};
}

const selectionModeButtons = document.getElementsByClassName('selection-modes');
for (var index = 0; index < selectionModeButtons.length; index++) {
	selectionModeButtons[index].onclick = function() {
		deselectAll();
		select = this.value;
	};
}

// Start the application
constructGrid();

