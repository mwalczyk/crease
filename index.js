import * as geom from './src/geometry.js';
import { PlanarGraph } from './src/graph.js';
import { Vec2 } from './src/math.js';
import { SelectionGroup, OrderedSelection } from './src/selection.js';

const snapsvg = require('snapsvg');

// Create a planar graph, which represents the crease pattern
let g = new PlanarGraph();

// Create the parent SVG element
console.log('Starting application...');
const s = Snap('#svg');
const w = s.attr().width;
const h = s.attr().height;
console.log(`Canvas size: ${w} x ${h}`);

const creaseAssignment = {
	MOUNTAIN: 'mountain',
	VALLEY: 'valley',
	BORDER: 'border'
};

const tools = {
	SELECT: 'select',
	LINE: 'line',
	LINE_SEGMENT: 'line-segment',
	PERPENDICULAR: 'perpendicular',
	INCENTER: 'incenter',
	DELETE_VERTEX: 'delete-vertex',
	DELETE_CREASE: 'delete-crease'
};

const helpMessages = {
	SELECT: 'Select an existing vertex or crease',
	LINE: 'Select two vertices to form an extended crease between them',
	LINE_SEGMENT: 'Select two vertices to form a crease between them',
	PERPENDICULAR: 'Select a vertex and a crease to form a perpendicular crease between them',
	INCENTER: 'Select three vertices to form creases connecting each vertex to the incenter of the corresponding triangle'
};

let selection = {
	'select': null,
	'line': new OrderedSelection([new SelectionGroup('vertex', 2)], helpMessages.LINE),
	'line-segment': new OrderedSelection([new SelectionGroup('vertex', 2)], helpMessages.LINE_SEGMENT),
	'perpendicular': new OrderedSelection([new SelectionGroup('vertex', 1), new SelectionGroup('crease', 1)], helpMessages.PERPENDICULAR),
	'incenter': new OrderedSelection([new SelectionGroup('vertex', 3)], helpMessages.INCENTER),
	'delete-vertex': new OrderedSelection([new SelectionGroup('vertex', 1)]),
	'delete-crease': null
};

// Configuration for application start
let tool = tools.LINE_SEGMENT;
const gridDivsX = 11;
const gridDivsY = 11;
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
function animateCycle(element, attrName, to, timeTo=50, timeFrom=50) {
	const from = element.attr(attrName);

	let anims = [
		function() {
			Snap.animate(from, to, function(val) { element.attr(attrName, val);  }, timeTo, mina.easein, anims[1]); 
		},
		function() {
			Snap.animate(to, from, function(val) { element.attr(attrName, val); }, timeFrom, mina.easeout);
		}
	];
	anims[0]();		
}

/**
 * Animates the group of objects that are currently selectable
 */
function notifySelectableElements() {
	// const className = selection[tool].currentGroup.className;
	// const elements = s.selectAll('.' + className);
	
	// s.selectAll('*').forEach(element => element.removeClass('selectable'));
	// elements.forEach(element => element.addClass('selectable'));

	// const timeTo = 50;
	// const timeFrom = 50;

	// switch (className) {
	// 	case 'vertex':
	// 		elements.forEach(el => animateCycle(el, 'r', 5.0));
	// 		break;
	// 	case 'crease':
			
	// 		elements.forEach(element => {
	// 			let anims = [
	// 				function() {
	// 					Snap.animate(4, 8, function(val) { element.attr({strokeWidth: val});  }, timeTo, mina.easein, anims[1]); 
	// 				},
	// 				function() {
	// 					Snap.animate(8, 4, function(val) { element.attr({strokeWidth: val}); }, timeFrom, mina.easeout);
	// 				}
	// 			];
	// 			anims[0]();	
	// 		});
	// 		break;
	// }	
}

function removeSelectedClass() {
	s.selectAll('*').forEach(element => element.removeClass('selected'));
}

function getBBoxCorners(element) {
	const ul = new Vec2(element.getBBox().cx - element.getBBox().width * 0.5,
						element.getBBox().cy - element.getBBox().height * 0.5);
	const ur = new Vec2(element.getBBox().cx + element.getBBox().width * 0.5,
						element.getBBox().cy - element.getBBox().height * 0.5);
	const lr = new Vec2(element.getBBox().cx + element.getBBox().width * 0.5,
						element.getBBox().cy + element.getBBox().height * 0.5);
	const ll = new Vec2(element.getBBox().cx - element.getBBox().width * 0.5,
						element.getBBox().cy + element.getBBox().height * 0.5);

	return [ul, ur, lr, ll];
}

function operate() {
	if (tool === tools.LINE_SEGMENT) {
		// Add a crease between the two selected vertices
		const vertices = selection[tool].groups[0].refs;
		addCrease(new Vec2(vertices[0].getBBox().cx, vertices[0].getBBox().cy),
				  new Vec2(vertices[1].getBBox().cx, vertices[1].getBBox().cy));

	} else if (tool === tools.LINE) {

		// Grab the SVG paper element and calculate its corners
		const paper = s.select('.paper');
		const [ul, ur, lr, ll] = getBBoxCorners(paper);
		const rawEdges = [
			[ul, ur],
			[ur, lr],
			[lr, ll],
			[ll, ul]
		];

		const vertices = selection[tool].groups[0].refs;

		// Find all of the points where this line intersects the paper's edges (there should only be 2)
		let intersections = []; 
		rawEdges.forEach(rawEdge => {
			const intersection = geom.calculateLineIntersection(rawEdge[0], 
													   		    rawEdge[1],
													   		    new Vec2(vertices[0].getBBox().cx, vertices[0].getBBox().cy),
													   		    new Vec2(vertices[1].getBBox().cx, vertices[1].getBBox().cy));
			if (intersection !== null) {
				intersections.push(intersection);
			}
		});

		// Filter out intersections that lie outside the paper's boundary
		intersections = intersections.filter(intersection => Snap.path.isPointInsideBBox(paper.getBBox(), intersection.x, intersection.y));
		console.assert(intersections.length === 2);

		// Add a crease that runs from intersection to intersection
		addCrease(intersections[0], intersections[1]);	

	} else if (tool === tools.INCENTER) {
		// Create 3 new creases that join each of the 3 points to their incenter
		const vertices = selection[tool].groups[0].refs;
		const incenter = geom.calculateTriangleIncenter(new Vec2(vertices[0].getBBox().cx, vertices[0].getBBox().cy),
												   		new Vec2(vertices[1].getBBox().cx, vertices[1].getBBox().cy), 
												   		new Vec2(vertices[2].getBBox().cx, vertices[2].getBBox().cy));

		if (!incenter) {
			console.log('Triangle is degenerate - no new creases will be added');
		} else {
			vertices.forEach(v => addCrease(new Vec2(v.getBBox().cx, v.getBBox().cy), incenter));
		}

	} else if (tool === tools.PERPENDICULAR) {
		// Drop a perpendicular from the specified vertex to the specified crease
		const vertices = selection[tool].groups[0].refs;
		const creases = selection[tool].groups[1].refs;
		let perp = geom.calculatePerpendicular(new Vec2(creases[0].attr().x1, creases[0].attr().y1), 
										  	   new Vec2(creases[0].attr().x2, creases[0].attr().y2),
										  	   new Vec2(vertices[0].getBBox().cx, vertices[0].getBBox().cy));

		addCrease(new Vec2(vertices[0].getBBox().cx, vertices[0].getBBox().cy), perp);

	} else if (tool === tools.DELETE_VERTEX) {
		// Deletion only requires a reference to a single vertex
		const vertex = selection[tool].groups[0].refs[0];
		removeVertex(vertex);
	}
}

/**
 * Checks if the selection is complete for the current tool 
 */
function checkSelectionStatus() {
	if (selection[tool].isComplete) {
		// Perform a geometric operation and add/remove creases, vertices, etc.
		operate();

		// Clear the selection group and deselect all SVG elements
		selection[tool].clear();
		removeSelectedClass();

		notifySelectableElements();
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
		// No assignment: set to M
		element.addClass(creaseAssignment.MOUNTAIN);
	}
}

// Callback function used by all selectable objects
let callbackClickSelectable = function(e) {
	const [didAdd, didAdvance] = selection[tool].maybeAdd(this);
	if (didAdd) {
		this.addClass('selected');
	}
	if (didAdvance) {
		notifySelectableElements();
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

let callbackCreaseHoverEnter = function() {
	this.attr({strokeWidth: 8});
}
let callbackCreaseHoverExit = function() {
	this.attr({strokeWidth: 4});
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
	if (geom.closeTo(a, b)) {
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

function removeCrease(element) {

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

	if (index >= g.edgeCount) {
		// This was an edge that was deleted
		console.log('Returning early from the draw crease function');
		return;
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
	svg.hover(callbackCreaseHoverEnter, callbackCreaseHoverExit);
	svg.append(Snap.parse(`<title>Edge: ${index}</title>`));

	// Add a "right-click" event listener
	svg.node.addEventListener('contextmenu', callbackCreaseDoubleClicked.bind(svg));

	// TODO: does Snap support z-ordering at all?
	const existingSVGvertices = s.selectAll('.vertex');
	if (existingSVGvertices.length > 0) {
		svg.insertBefore(existingSVGvertices[0]);
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

function removeVertex(element) {
	const targetIndex = element.data('index');
	const [nodeIndices, edgeIndices] = g.removeNode(targetIndex);

	nodeIndices.forEach(index => drawVertex(index));
	edgeIndices.forEach(index => drawCrease(index));
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

	if (index >= g.nodeCount) {
		// This was a node that was deleted
		console.log('Returning early from the draw vertex function');
		return;
	}

	let svg = s.circle(g.nodes[index].x, g.nodes[index].y, vertexDrawRadius);

	svg.addClass('vertex');
	svg.data('index', index);
	svg.click(callbackClickSelectable);
	svg.hover(callbackVertexHoverEnter, callbackVertexHoverExit);
	svg.append(Snap.parse(`<title>Vertex: ${index}</title>`));
}

function drawTooltip(x, y, text, padding) {
	// First, create the text element
	let svgEscText = s.text(x, y, text);

	svgEscText.attr({
		fontFamily: 'Sans-Serif',
		fontSize: '12px'
	})
	svgEscText.addClass('tool-tip');

	// Create the rectangular background behind the text
	let svgEscBackground = s.rect(svgEscText.getBBox().x - padding * 0.5, 
								  svgEscText.getBBox().y - padding * 0.5, 
								  svgEscText.getBBox().width + padding, 
								  svgEscText.getBBox().height + padding);
	svgEscBackground.attr({
		rx: '2px',
		ry: '2px'
	});
	svgEscBackground.addClass('tool-tip-background');

    svgEscBackground.insertBefore(svgEscText);
}

function setupCanvas() {
	const gridSizeX = w / 2;
	const gridSizeY = h / 2;
	const paperCenterX = gridSizeX;
	const paperCenterY = gridSizeY; 
	
	// TODO: this is done so that when we calculate line intersections with the raw edges
	// of the paper, we can rule out intersection points that lie outside of the paper 
	const paperPadX = 0.5; // gridSizeX / (gridDivsX - 1);
	const paperPadY = 0.5; // gridSizeY / (gridDivsY - 1);

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
			
			let svgGridPoint = s.circle(posX, posY, gridPointDrawRadius);
			svgGridPoint.addClass('vertex');
			svgGridPoint.click(callbackClickSelectable);
		}
	}
}

function updateToolTip() {
	// Remove any existing tool tip elements
	s.selectAll('.tool-tip').forEach(element => element.remove());
	s.selectAll('.tool-tip-background').forEach(element => element.remove());
	const help = selection[tool].help;

	drawTooltip(30, h - 30, help, 20);
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
		notifySelectableElements();
		updateToolTip();
	});
});

document.addEventListener('keydown', function(event) {
    if (event.keyCode === 13) {
    	// Print the planar graph
    	console.log('Nodes:', g.nodes);
    	console.log('Edges:', g.edges);
    } else if (event.keyCode === 71) {
    	// Hide or show all vertices
    	s.selectAll('.vertex').forEach(element => {
			const showOrHide = showOrHide === undefined ? element.attr('display') === 'none' : !!showOrHide;
    		element.attr('display', (showOrHide ? '' : 'none'));
    	});
    } else if (event.keyCode === 27) {
    	const removed = selection[tool].maybePop();
    	if (removed !== undefined) {
    		removed.removeClass('selected');
    	}
    }
});

// Start the application
setupCanvas();

