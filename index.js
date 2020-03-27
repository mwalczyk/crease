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
//	Docs:
//
//		[1](https://github.com/greggman/twgl.js/blob/master/src/textures.js)
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
    	console.log(g.vertices);
    	console.log(g.edges);
    }
});


const creaseAssignment = {
	MOUNTAIN: 'mountain',
	VALLEY: 'valley',
	BORDER: 'border'
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
const gridPointDrawRadius = 6;
const vertexDrawRadius = 6;
const creaseStrokeWidth = 4;

function deselectAllVertices() {
	s.selectAll('.vertex-selected').forEach(el => el.removeClass('vertex-selected'));
}

function deselectAllCreases() {
	s.selectAll('.crease-selected').forEach(el => el.removeClass('crease-selected'));
}

function deselectAll() {
	deselectAllVertices()
	deselectAllCreases()
}


// ADD EVENT LISTENERS TO MAIN SVG
// RECORD MOUSE CLICK POSITIONS AND USE THE X,Y,X,Y VERSIONS OF THE FUNCTIONS
// TO ADD CREASES AND VERTICES


// OR MAYBE, CHANGE THE CALLBACKS BELOW SO THAT EACH TIME AN ELEMENT IS CLICKED,
// IT SIMPLY ADDS ITS INTERNAL ID TO THE SELECTION GROUP, AND CALLS A "CHECK-SELECTION-STATUS"
// FUNCTION THAT DOES ALL OF THE OPERATIONS/SWITCHING 




/**
 * Applies a cyclic animation to a particular attribute of an SVG DOM element
 * @param {DOM element} element - the DOM SVG element to animate
 * @param {string} name - the name of the attribute to animate	
 * @param {number} to - the target value of the named attribute
 * @param {number} from - the starting value of the named attribute
 * @param {number} timeTo - the duration of the target animation 
 * @param {number} timeFrom - the duration of the return animation
 */
function animateCycle(element, name, to, from, timeTo=200, timeFrom=50) {
	let anims = [
		function() {
			Snap.animate(from, to, function(val) { element.attr(name, val);  }, timeTo, mina.elastic, anims[1]); 
		},
		function() {
			Snap.animate(to, from, function(val) { element.attr(name, val); }, timeFrom, mina.bounce);
		}
	];
	anims[0]();		
}

/**
 * Sets the type of object that is currently selectable
 * @param {string} mode - the (class) name of DOM elements that should become selectable
 * @param {boolean} animate - whether or not the corresponding elements should animate when they become selectable
 */
function setSelectionMode(mode, animate=true) {
	console.log(`Switching to selection mode: ${mode}`);
	select = mode;

	if (animate) {
		switch (mode) {
			case selectionModes.VERTEX:
				s.selectAll('.vertex').forEach(el => animateCycle(el, 'r', vertexDrawRadius * 1.2, vertexDrawRadius));
				break;
			case selectionModes.CREASE:
				s.selectAll('.crease').forEach(el => animateCycle(el, 'strokeWidth', creaseStrokeWidth * 1.2, creaseStrokeWidth));
				break;
		}
	}
}


function checkSelectionStatus() {
	let didComplete = false;

	if (tool === tools.LINE_SEGMENT) {

		if (selectionGroups[tool].hasRequiredVertices) {
			// Add a crease between the two selected vertices
			addCrease(selectionGroups[tool].vertices[0], selectionGroups[tool].vertices[1]);

			didComplete = true;
		}

	} else if (tool === tools.LINE) {

	} else if (tool === tools.INCENTER) {

		if (selectionGroups[tool].hasRequiredVertices) {
			// Create 3 new creases that join each of the 3 points to their incenter
			const incenter = calculateTriangleIncenter(selectionGroups[tool].vertices[0], 
													   selectionGroups[tool].vertices[1], 
													   selectionGroups[tool].vertices[2]);

			selectionGroups[tool].vertices.forEach(v => addCrease(v, incenter));
			didComplete = true;
		}

	} else if (tool === tools.PERPENDICULAR) {

		if (selectionGroups[tool].hasRequiredVertices) {
			if (selectionGroups[tool].hasRequiredCreases) {
				// Drop a perpendicular from the specified vertex to the specified crease
				let perp = calculatePerpendicular(selectionGroups[tool].creases[0][0], 
												  selectionGroups[tool].creases[0][1], 
												  selectionGroups[tool].vertices[0]);

				addCrease(selectionGroups[tool].vertices[0], perp);

				didComplete = true;
			} else {
				setSelectionMode(selectionModes.CREASE);
			}
		}

	}

	if (didComplete) {
		// Clear the selection group and deselect all SVG elements
		selectionGroups[tool].clear();
		deselectAll();

		if (selectionGroups[tool].verticesFirst) {
			setSelectionMode(selectionModes.VERTEX);
		}
	}
}

function cycleCreaseAssignmet(element) {
	if (element.hasClass(creaseAssignment.MOUNTAIN)) {
		// Move from M -> V
		element.removeClass(creaseAssignment.MOUNTAIN);
		element.addClass(creaseAssignment.VALLEY);
	} else if (element.hasClass(creaseAssignment.VALLEY)) {
		// Move from V -> B
		element.removeClass(creaseAssignment.VALLEY);
		element.addClass(creaseAssignment.BORDER);
	} else if (element.hasClass(creaseAssignment.BORDER)) {
		// Move from B -> M
		element.removeClass(creaseAssignment.BORDER);
		element.addClass(creaseAssignment.MOUNTAIN);
	} else {
		// No assignment: set to border
		element.addClass(creaseAssignment.BORDER);
	}
}

// Crease callback functions
let callbackCreaseClicked = function() {

	let position0 = new Vec2(this.attr().x1, this.attr().y1);
	let position1 = new Vec2(this.attr().x2, this.attr().y2);

	selectionGroups[tool].maybeRecordCrease([position0, position1]);
	checkSelectionStatus();
}

let callbackCreaseDoubleClicked = function() {
	cycleCreaseAssignmet(this);
}

// Vertex callback functions
let callbackVertexClicked = function() {

	let position = new Vec2(this.getBBox().cx, this.getBBox().cy);

	selectionGroups[tool].maybeRecordVertex(position);
	checkSelectionStatus();
}

let callbackVertexHoverEnter = function() {
	this.attr({'r': vertexDrawRadius * 2});
}
let callbackVertexHoverExit = function() {
	this.attr({'r': vertexDrawRadius * 1});
}







function findElementWithIndex(selector, index) {
	const elements = Array.from(s.selectAll(selector));
	return elements.find(element => element.data('index') === index);
}

function removeElementWithIndex(selector, index) {
	const maybeElement = findElementWithIndex(selector, index);
	if (maybeElement !== undefined) {
		maybeElement.remove();
		return true;
	}
	return false;
}






/**
 * Attempts to add a new edge to the planar graph
 * @param {Vec2} a - the first endpoint of the edge
 * @param {Vec2} b - the second endpoint of the edge	
 */
function addCrease(a, b) {

	let index0 = addVertex(a);
	let index1 = addVertex(b);
	let edgeIndex = g.addEdge(index0, index1);

	drawCrease(edgeIndex)

	return crease;
}

/**
 * Draws a virtual crease (i.e. an SVG line segment)
 * @param {number} index - the index of the edge in the underlying planar graph that this crease corresponds to	
 */
function drawCrease(index) {

	if (removeElementWithIndex('.crease', index)) {
		console.log(`Crease SVG with stored index ${index} was removed and re-added`);
	} else {
		console.log(`Crease SVG with stored index: ${index} was newly added`);
	}

	let svg = s.line(
		g.vertices[g.edges[index][0]].x,
		g.vertices[g.edges[index][0]].y,
		g.vertices[g.edges[index][1]].x,
		g.vertices[g.edges[index][1]].y
	);

	svg.addClass('crease');
	svg.data('index', index);
	svg.click(callbackCreaseClicked);
	svg.dblclick(callbackCreaseDoubleClicked);
	svg.append(Snap.parse(`<title>Edge: ${index}</title>`));

	// TODO: does Snap support z-ordering at all?
	const existingSVGvertices = s.selectAll('.vertex');
	if (existingSVGvertices.length > 0) {
		svg.insertBefore(existingSVGvertices[0]);
	}
}

/**
 * Attempts to add a new node to the planar graph
 * @param {Vec2} p - the position of the node
 */
function addVertex(p) {

	const [nodeIndex, changedEdgeIndices] = g.addNode(p);

	// Draw the vertex
	drawVertex(nodeIndex);
	
	// Draw any changed creases
	changedEdgeIndices.forEach(edgeIndex => {
		// drawCrease(...) 
	});

	return nodeIndex;
}

/**
 * Draws a virtual vertex (i.e. an SVG circle)
 * @param {number} index - the index of the node in the underlying planar graph that this vertex corresponds to	
 */
function drawVertex(index) {

	if (removeElementWithIndex('.vertex', index)) {
		console.log(`Vertex SVG with stored index ${index} was removed and re-added`);
	} else {
		console.log(`Vertex SVG with stored index: ${index} was newly added`);
	}

	let svg = s.circle(g.vertices[index].x, 
					   g.vertices[index].y, 
					   vertexDrawRadius);

	svg.addClass('vertex');
	svg.data('index', index);
	svg.click(callbackVertexClicked);
	svg.hover(callbackVertexHoverEnter, callbackVertexHoverExit);
	svg.append(Snap.parse(`<title>Vertex: ${index}</title>`));
}










function drawGridPoint(x, y) {
	const w = gridPointDrawRadius;
	const h = gridPointDrawRadius;

	let svg = s.rect(x - w * 0.5, y - h * 0.5, w, h);

	svg.addClass('grid-point');
	svg.click(callbackVertexClicked);
}

function constructGrid() {
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
			drawGridPoint(posX, posY);
		}
	}
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

