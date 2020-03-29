import { PlanarGraph } from './graph.js';
import { Vec2 } from './math.js';
import { SelectionGroup, OrderedSelection } from './selection.js';
import { calculateTriangleIncenter, calculatePerpendicular, closeTo } from './geometry.js';

const snapsvg = require('snapsvg');

// Displays the element
Element.prototype.show = function() {
	this.attr('display', '');
};

// Hides the element
Element.prototype.hide = function() {
	this.attr('display', 'none');
};

Element.prototype.toggleVisibility = function() {
	if (this.attr().display === '') {
		this.attr('display', 'none');
	} else {
		this.attr('display', '');
	}
};

// Setting up the dev environment:
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
// 		[Snap SVG Tutorials](http://svg.dabbles.info/snaptut-dragscale)
//		[Snap SVG Cheat Sheet](https://gist.github.com/osvik/0185cb4381b35aad3d3e1f5438ca5ca4)
//		[Guide to CSS Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
//		[Using Enums in Javascript](https://www.sohamkamani.com/blog/2017/08/21/enums-in-javascript/)
// 		[Figma Typeface](https://www.abcdinamo.com/typefaces/whyte)
//		[CORS and WebGL Textures](https://webgl2fundamentals.org/webgl/lessons/webgl-cors-permission.html)
//		[Toggling Visibility](http://www.alexnormand.com/blog/2014/03/09-show-hide-an-element-and-add-remove-classes-from-an-element-with-snapsvg/)
//
//	Math stuff:
//
// 		[Calculating Perpendiculars](https://stackoverflow.com/questions/1811549/perpendicular-on-a-line-from-a-given-point)
//		[Calculating Line Segment Intersections](https://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect)
//		[Calculating Triangle Incenters](https://www.mathopenref.com/coordincenter.html)
//
//	Docstring inspiration:
//
//		[TWGL](https://github.com/greggman/twgl.js/blob/master/src/textures.js)
//
// To run:
//
// 		watchify index.js -o bundle.js
//
// or:
//
//		npm run bundle-watch
//

// An embedding of a planar graph, representing the crease pattern
let g = new PlanarGraph();

// Create the `Element` object that will house all of the other SVGs
console.log('Starting application...');
const s = Snap('#svg');
const w = s.attr().width;
const h = s.attr().height;
console.log(`SVG size: ${w} x ${h}`);

const creaseAssignment = {
	MOUNTAIN: 'mountain',
	VALLEY: 'valley',
	BORDER: 'border'
};

const tools = {
	LINE_SEGMENT: 'line-segment',
	LINE: 'line',
	INCENTER: 'incenter',
	PERPENDICULAR: 'perpendicular'
};

let selection = {
	'line-segment': new OrderedSelection([new SelectionGroup('vertex', 2)]),
	'line': new OrderedSelection([new SelectionGroup('vertex', 2)]),
	'incenter': new OrderedSelection([new SelectionGroup('vertex', 3)]),
	'perpendicular': new OrderedSelection([new SelectionGroup('vertex', 1), new SelectionGroup('crease', 1)])
};

// Configuration for application start
let tool = tools.LINE_SEGMENT;
let gridDivsX = 11;
let gridDivsY = 11;
const gridPointDrawRadius = 4;
const vertexDrawRadius = 6;
const creaseStrokeWidth = 4;

/**
 * Applies a cyclic animation to a particular attribute of an SVG DOM element
 * @param {DOM element} element - the DOM SVG element to animate
 * @param {string} attrName - the name of the attribute to animate	
 * @param {number} percent - the percent increase (or decrease) of the specified attribute
 * @param {number} timeTo - the duration of the target animation 
 * @param {number} timeFrom - the duration of the return animation
 */
function animateCycle(element, attrName, percent, timeTo=200, timeFrom=50) {
	const to = element.attr(attrName) * percent;
	const from = element.attr(attrName);

	let anims = [
		function() {
			Snap.animate(from, to, function(val) { element.attr(attrName, val);  }, timeTo, mina.elastic, anims[1]); 
		},
		function() {
			Snap.animate(to, from, function(val) { element.attr(attrName, val); }, timeFrom, mina.bounce);
		}
	];
	anims[0]();		
}

/**
 * Animates the group of objects that are currently selectable
 */
function animateSelectableObjects() {
	const className = selection[tool].currentGroup.className;
	const elements = s.selectAll('.' + className);
	
	switch (className) {
		case 'vertex':
			elements.forEach(el => animateCycle(el, 'r', 1.2));
			break;
		case 'crease':
			// TODO: this isn't working for some reason?
			elements.forEach(el => animateCycle(el, 'stroke-width', 4.2));
			break;
	}	
}

function removeSelectedClass() {
	s.selectAll('*').forEach(element => element.removeClass('selected'));
}

function operate() {
	if (tool === tools.LINE_SEGMENT) {
		// Add a crease between the two selected vertices
		const vertices = selection[tool].groups[0].refs;
		addCrease(new Vec2(vertices[0].getBBox().cx, vertices[0].getBBox().cy),
				  new Vec2(vertices[1].getBBox().cx, vertices[1].getBBox().cy));

	} else if (tool === tools.LINE) {

	} else if (tool === tools.INCENTER) {
		// Create 3 new creases that join each of the 3 points to their incenter
		const vertices = selection[tool].groups[0].refs;
		const incenter = calculateTriangleIncenter(new Vec2(vertices[0].getBBox().cx, vertices[0].getBBox().cy),
												   new Vec2(vertices[1].getBBox().cx, vertices[1].getBBox().cy), 
												   new Vec2(vertices[2].getBBox().cx, vertices[2].getBBox().cy));

		vertices.forEach(v => addCrease(new Vec2(v.getBBox().cx, v.getBBox().cy), incenter));

	} else if (tool === tools.PERPENDICULAR) {
		// Drop a perpendicular from the specified vertex to the specified crease
		const vertices = selection[tool].groups[0].refs;
		const creases = selection[tool].groups[1].refs;
		let perp = calculatePerpendicular(new Vec2(creases[0].attr().x1, creases[0].attr().y1), 
										  new Vec2(creases[0].attr().x2, creases[0].attr().y2),
										  new Vec2(vertices[0].getBBox().cx, vertices[0].getBBox().cy));

		addCrease(new Vec2(vertices[0].getBBox().cx, vertices[0].getBBox().cy), perp);

	}
}

/**
 * Checks if the selection is complete for the current tool 
 */
function checkSelectionStatus() {
	if (selection[tool].isComplete) {
		operate();

		// Clear the selection group and deselect all SVG elements
		selection[tool].clear();
		removeSelectedClass();
		animateSelectableObjects();
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

// Callback function used by all selectable objects
let callbackClickSelectable = function() {
	const [didAdd, didAdvance] = selection[tool].maybeAdd(this);
	if (didAdd) {
		this.addClass('selected');
	}
	if (didAdvance) {
		animateSelectableObjects();
	}
	checkSelectionStatus();
}

// Additional crease callback functions
let callbackCreaseDoubleClicked = function() {
	cycleCreaseAssignmet(this);
}

// Additional vertex callback functions
let callbackVertexHoverEnter = function() {
	this.attr({'r': vertexDrawRadius * 1.25});
}
let callbackVertexHoverExit = function() {
	this.attr({'r': vertexDrawRadius * 1.00});
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
 * Adds a new crease to the paper, modifying the underlying planar graph as necessary
 * @param {Vec2} a - the coordinates of the first endpoint of the crease
 * @param {Vec2} b - the coordinates of the second endpoint of the crease	
 */
function addCrease(a, b) {
	// Don't add a crease if the two points are the same (or extremely close to one another)
	if (closeTo(a, b)) {
		console.log('No crease created - the specified points are overlapping');
		return;
	}

	let indexA = addVertex(a);
	let indexB = addVertex(b);
	let [nodeIndices, edgeIndices] = g.addEdge(indexA, indexB);

	nodeIndices.forEach(index => drawVertex(index));
	edgeIndices.forEach(index => drawCrease(index));

	// return edgeIndex? - see `addVertex`
}

/**
 * Draws a virtual crease (i.e. an SVG line segment)
 * @param {number} index - the index of the edge in the underlying planar graph that this crease corresponds to	
 */
function drawCrease(index) {
	// Remove any duplicates
	if (removeElementWithIndex('.crease', index)) {
		console.log(`Crease SVG with stored index ${index} was removed and re-added`);
	} else {
		console.log(`Crease SVG with stored index: ${index} was newly added`);
	}

	let svg = s.line(
		g.nodes[g.edges[index][0]].x,
		g.nodes[g.edges[index][0]].y,
		g.nodes[g.edges[index][1]].x,
		g.nodes[g.edges[index][1]].y
	);

	svg.addClass('crease');
	svg.data('index', index);
	svg.click(callbackClickSelectable);
	svg.dblclick(callbackCreaseDoubleClicked);
	svg.append(Snap.parse(`<title>Edge: ${index}</title>`));

	// TODO: does Snap support z-ordering at all?
	const existingSVGvertices = s.selectAll('.vertex');
	if (existingSVGvertices.length > 0) {
		svg.insertAfter(existingSVGvertices[0]);
	}
}

/**
 * Adds a new vertex (reference point) to the paper, modifying the underlying planar graph as necessary
 * @param {Vec2} p - the coordinates of the vertex
 */
function addVertex(p) {
	// Try to add a new node to the graph
	const [nodeIndex, edgeIndices] = g.addNode(p);

	// Draw the vertex and redraw any creases that may have changed as a result of the addition
	drawVertex(nodeIndex);
	edgeIndices.forEach(index => drawCrease(index));

	return nodeIndex;
}

/**
 * Draws a virtual vertex (i.e. an SVG circle)
 * @param {number} index - the index of the node in the underlying planar graph that this vertex corresponds to	
 */
function drawVertex(index) {
	// Remove any duplicates
	if (removeElementWithIndex('.vertex', index)) {
		console.log(`Vertex SVG with stored index ${index} was removed and re-added`);
	} else {
		console.log(`Vertex SVG with stored index: ${index} was newly added`);
	}

	let svg = s.circle(g.nodes[index].x, g.nodes[index].y, vertexDrawRadius);

	svg.addClass('vertex');
	svg.data('index', index);
	svg.click(callbackClickSelectable);
	svg.hover(callbackVertexHoverEnter, callbackVertexHoverExit);
	svg.append(Snap.parse(`<title>Vertex: ${index}</title>`));
}










function drawGridPoint(x, y) {
	let svg = s.circle(x, y, gridPointDrawRadius);
	svg.addClass('vertex');
	svg.click(callbackClickSelectable);
}

function drawGrid() {
	const gridSizeX = w / 2;
	const gridSizeY = h / 2;
	const paperCenterX = gridSizeX;
	const paperCenterY = gridSizeY; 
	const paperPadX = gridSizeX / (gridDivsX - 1);
	const paperPadY = gridSizeY / (gridDivsY - 1);

	let svgBackgroud = s.rect(0, 0, w, h);
	svgBackgroud.addClass('background');

	let svgPaper = s.rect(paperCenterX - gridSizeX * 0.5 - paperPadX * 0.5,
						  paperCenterY - gridSizeY * 0.5 - paperPadY * 0.5,
						  gridSizeX + paperPadX,
						  gridSizeY + paperPadY);
	svgPaper.addClass('paper');

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

// Add event listeners to tool icons
const toolIcons = Array.from(document.getElementsByClassName('tool-icon'));

function deselectAllIcons() {
	toolIcons.forEach(element => element.classList.remove('selected'));
}

toolIcons.forEach(element => {
	// Select the initial tool icon
	if (element.getAttribute('op') === tool) {
		element.classList.add('selected');
	}

	element.addEventListener('click', function() {
		// Deselect the previous tool icon
		deselectAllIcons();
		this.classList.add('selected');

		// Switch tools
		tool = this.getAttribute('op');
		console.log(`Switched to tool: ${tool}`)

		selection[tool].clear();
		animateSelectableObjects();
	});
});

document.addEventListener('keydown', function(event) {
    if (event.keyCode === 13) {
    	console.log('Nodes:', g.nodes);
    	console.log('Edges:', g.edges);
    } else if (event.keyCode === 71) {
    	s.selectAll('.vertex').forEach(element => {

			const showOrHide = showOrHide === undefined ? element.attr('display') === 'none' : !!showOrHide;
    		element.attr('display', (showOrHide ? '' : 'none'));
    	});
    }
});

// Start the application
drawGrid();

