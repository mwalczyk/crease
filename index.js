import * as geom from './src/geometry.js';
import { PlanarGraph } from './src/graph.js';
import { Vec2 } from './src/math.js';
import { SelectionGroup, OrderedSelection } from './src/selection.js';

const snapsvg = require('snapsvg');
const html2canvas = require('html2canvas');

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
	DROP_PERPENDICULAR: 'drop-perpendicular',
	PERPENDICULAR_BISECTOR: 'perpendicular-bisector',
	INCENTER: 'incenter',
	DELETE_VERTEX: 'delete-vertex',
	DELETE_CREASE: 'delete-crease'
};

const helpMessages = {
	SELECT: 'Select an existing vertex or crease',
	LINE: 'Select two vertices to form an extended crease between them',
	LINE_SEGMENT: 'Select two vertices to form a crease between them',
	DROP_PERPENDICULAR: 'Select a vertex and a crease to drop a perpendicular crease from the vertex to the selected crease',
	PERPENDICULAR_BISECTOR: 'Select a pair of vertices to form the perpendicular bisector between them',
	INCENTER: 'Select three vertices to form creases connecting each vertex to the incenter of the corresponding triangle',
	DELETE_VERTEX: 'Delete a single vertex and all incident creases',
	DELETE_CREASE: 'Delete a single crease'
};

let selection = {
	'select': null,
	'line': new OrderedSelection([new SelectionGroup('vertex', 2)], helpMessages.LINE),
	'line-segment': new OrderedSelection([new SelectionGroup('vertex', 2)], helpMessages.LINE_SEGMENT),
	'drop-perpendicular': new OrderedSelection([new SelectionGroup('vertex', 1), new SelectionGroup('crease', 1)], helpMessages.DROP_PERPENDICULAR),
	'perpendicular-bisector': new OrderedSelection([new SelectionGroup('vertex', 2)], helpMessages.PERPENDICULAR_BISECTOR),
	'incenter': new OrderedSelection([new SelectionGroup('vertex', 3)], helpMessages.INCENTER),
	'delete-vertex': new OrderedSelection([new SelectionGroup('vertex', 1)], helpMessages.DELETE_VERTEX),
	'delete-crease': new OrderedSelection([new SelectionGroup('crease', 1)], helpMessages.DELETE_CREASE)
};

let files = {
	SAVE: 'save'
};

// Configuration for application start
let tool = tools.LINE_SEGMENT;
const gridDivsX = 11;
const gridDivsY = 11;
const gridPointDrawRadius = 2;
const vertexDrawRadius = 4;
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
	const className = selection[tool].currentGroup.className;
	const elements = s.selectAll('.' + className);
	
	s.selectAll('*').forEach(element => element.removeClass('selectable'));
	elements.forEach(element => element.addClass('selectable'));

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

		// Drawing a line exactly along the diagonal results in duplicate points of intersection
		intersections = geom.uniquePointsAmong(intersections);

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

	} else if (tool === tools.DROP_PERPENDICULAR) {
		// Drop a perpendicular from the specified vertex to the specified crease
		const vertices = selection[tool].groups[0].refs;
		const creases = selection[tool].groups[1].refs;
		let perp = geom.calculatePerpendicularPoint(new Vec2(creases[0].attr().x1, creases[0].attr().y1), 
										  	   		new Vec2(creases[0].attr().x2, creases[0].attr().y2),
										  	   		new Vec2(vertices[0].getBBox().cx, vertices[0].getBBox().cy));

		addCrease(new Vec2(vertices[0].getBBox().cx, vertices[0].getBBox().cy), perp);

	} else if (tool === tools.PERPENDICULAR_BISECTOR) {
		const vertices = selection[tool].groups[0].refs;
		let [perp0, perp1] = geom.calculatePerpendicularBisector(new Vec2(vertices[0].getBBox().cx, vertices[0].getBBox().cy),
																 new Vec2(vertices[1].getBBox().cx, vertices[1].getBBox().cy));

		// Grab the SVG paper element and calculate its corners
		const paper = s.select('.paper');
		const [ul, ur, lr, ll] = getBBoxCorners(paper);
		const rawEdges = [
			[ul, ur],
			[ur, lr],
			[lr, ll],
			[ll, ul]
		];

		// Find all of the points where this line intersects the paper's edges (there should only be 2)
		let intersections = []; 
		rawEdges.forEach(rawEdge => {
			const intersection = geom.calculateLineIntersection(rawEdge[0], 
													   		    rawEdge[1],
													   		    perp0,
													   		    perp1);
			if (intersection !== null) {
				intersections.push(intersection);
			}
		});

		// Drawing a line exactly along the diagonal results in duplicate points of intersection
		intersections = geom.uniquePointsAmong(intersections);

		// Filter out intersections that lie outside the paper's boundary
		intersections = intersections.filter(intersection => Snap.path.isPointInsideBBox(paper.getBBox(), intersection.x, intersection.y));
		console.assert(intersections.length === 2);

		// Add a crease that runs from intersection to intersection
		addCrease(intersections[0], intersections[1]);	

	} else if (tool === tools.DELETE_VERTEX) {
		// Deletion only requires a reference to a single vertex
		const vertex = selection[tool].groups[0].refs[0];
		removeVertex(vertex);

	} else if (tool === tools.DELETE_CREASE) {
		// Deletion only requires a reference to a single crease
		const crease = selection[tool].groups[0].refs[0];
		removeCrease(crease);

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

		// Animate any elements that may now be selectable
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
}

function removeCrease(element) {
	// Grab the index of the graph edge that this crease corresponds to
	const targetIndex = element.data('index');

	// Removing a crease results in a list of node / edge indices that have changed - note that some of
	// these may correspond to nodes / edges that were deleted
    const [nodeIndices, edgeIndices] = g.removeEdge(targetIndex);
	nodeIndices.forEach(index => drawVertex(index));
	edgeIndices.forEach(index => drawCrease(index));
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
		// This was probably an edge that was deleted - the code above will handle removing the SVG element, so
		// no further processing needs to happen
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
	svg.append(Snap.parse(`<title>Edge: ${index}</title>`));

	// Add a "right-click" event listener
	svg.node.addEventListener('contextmenu', callbackCreaseDoubleClicked.bind(svg));

	// TODO: does Snap support z-ordering at all?
	const svgVertices = s.selectAll('.vertex');
	if (svgVertices.length > 0) {
		svg.insertBefore(svgVertices[0]);
	}

	return svg;
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
	// Grab the index of the graph node that this vertex corresponds to
	const targetIndex = element.data('index');
	if (targetIndex === undefined) {
		console.log('Attempting to delete a grid reference point - ignoring')
		return;
	}

	// Removing a node results in a list of node / edge indices that have changed - note that some of
	// these may correspond to nodes / edges that were deleted
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
		// This was probably a node that was deleted - the code above will handle removing the SVG element, so
		// no further processing needs to happen
		console.log('Returning early from the draw vertex function');
		return;
	}

	let svg = s.circle(g.nodes[index].x, g.nodes[index].y, vertexDrawRadius);

	svg.addClass('vertex');
	svg.data('index', index);
	svg.click(callbackClickSelectable);
	svg.hover(callbackVertexHoverEnter, callbackVertexHoverExit); // These can't be animated with CSS
	svg.append(Snap.parse(`<title>Vertex: ${index}</title>`));

	return svg;
}




function drawTooltip(x, y, text, padding) {
	// First, create the text element
	let svgText = s.text(x, y, text);

	svgText.attr({
		fontFamily: 'Sans-Serif',
		fontSize: '10px'
	});
	svgText.addClass('tool-tip');

	// Then, create the rectangular background behind the text
	let svgBackground = s.rect(svgText.getBBox().x - padding * 0.5, 
							   svgText.getBBox().y - padding * 0.5, 
							   svgText.getBBox().width + padding, 
							   svgText.getBBox().height + padding);
	svgBackground.attr({ rx: '2px', ry: '2px' });
	svgBackground.addClass('tool-tip-background');
    svgBackground.insertBefore(svgText);
}

function updateToolTip() {
	// Remove any existing tool tip elements
	s.selectAll('.tool-tip').forEach(element => element.remove());
	s.selectAll('.tool-tip-background').forEach(element => element.remove());
	const help = selection[tool].help;

	// Add the new tool tip
	const x = 30;
	const y = h - 30;
	const padding = 20;
	drawTooltip(x, y, help, padding);
}

function setupCanvas() {
	// The paper is a percentage of the total canvas size
	const gridSizeX = w * 0.75;
	const gridSizeY = h * 0.75;
	const paperCenterX = w * 0.5;
	const paperCenterY = h * 0.5; 
	
	// TODO: this is done so that when we calculate line intersections with the raw edges
	// of the paper, we can rule out intersection points that lie outside of the paper 
	const paperPadX = 0.5; // gridSizeX / (gridDivsX - 1);
	const paperPadY = 0.5; // gridSizeY / (gridDivsY - 1);

	let svgBackgroud = s.rect(0, 0, w, h);
	svgBackgroud.addClass('background');

	const shadow = s.filter(Snap.filter.shadow(20, 20, 0.2, 'black', 0.0625));
	let svgPaper = s.rect(paperCenterX - gridSizeX * 0.5 - paperPadX * 0.5,
						  paperCenterY - gridSizeY * 0.5 - paperPadY * 0.5,
						  gridSizeX + paperPadX,
						  gridSizeY + paperPadY);
	svgPaper.attr({ filter: shadow });
	svgPaper.addClass('paper');

	for (var y = 0; y < gridDivsY; y++) {
		for (var x = 0; x < gridDivsX; x++) {
			let percentX = x / (gridDivsX - 1);
			let percentY = y / (gridDivsY - 1);
			let posX = percentX * gridSizeX + paperCenterX - gridSizeX * 0.5;
			let posY = percentY * gridSizeY + paperCenterY - gridSizeY * 0.5;
			
			let svgGridPoint = s.circle(posX, posY, gridPointDrawRadius);
			svgGridPoint.addClass('vertex');
			svgGridPoint.click(callbackClickSelectable);
		}
	}
}

function handleFileAction(action) {
	if (action === files.SAVE) {

		html2canvas(document.querySelector("#svg")).then(canvas => {
		    document.body.appendChild(canvas)

		    var img = canvas.toDataURL("image/png");
		    document.write('<img src="'+img+'"/>');
		});

	} else {
		// ...load, etc.

	}
}


// The DOM elements corresponding to all of the tool icons (line, line segment, perpendicular, etc.)
const toolIcons = Array.from(document.getElementsByClassName('tool-icon'));
const fileIcons = Array.from(document.getElementsByClassName('file-icon')); 

/**
 * Removes the class "selected" from all existing SVG elements
 */
function deselectAll(icons) {
	icons.forEach(element => element.classList.remove('selected'));
}

toolIcons.forEach(element => {
	// Select the initial tool icon
	if (element.getAttribute('op') === tool) {
		element.classList.add('selected');
	}

	element.addEventListener('click', function() {
		// Deselect the previous tool icon and select this one
		deselectAll(toolIcons);
		this.classList.add('selected');

		// Switch tools - sanity check below
		tool = this.getAttribute('op');
		if (!Object.keys(selection).includes(tool)) {
			console.error(`No tool with operation ${tool} found`);
		} else {
			console.log(`Switched to tool: ${tool}`);
		}

		// Clear out the current selection
		selection[tool].clear();

		// Remove the "selected" class from all objects, as a selection could have been in progress
		removeSelectedClass();

		// Make new objects selectable
		notifySelectableElements();

		// Notify the user with a tool tip
		updateToolTip();
	});
});

fileIcons.forEach(element => {

	element.addEventListener('click', function() {
		deselectAll(fileIcons);

		// Save, load, etc.
		let action = this.getAttribute('op');
		
		handleFileAction(action);
		
	});
});

document.addEventListener('keydown', function(event) {
	const keyEnter = 13;
	const keyG = 71;
	const keyEsc = 27;

    if (event.keyCode === keyEnter) {
    	// Print the planar graph
    	console.log('Nodes:', g.nodes);
    	console.log('Edges:', g.edges);

    } else if (event.keyCode === keyG) {
    	// Hide or show all vertices
    	s.selectAll('.vertex').forEach(element => {
			const showOrHide = showOrHide === undefined ? element.attr('display') === 'none' : !!showOrHide;
    		element.attr('display', (showOrHide ? '' : 'none'));
    	});

    } else if (event.keyCode === keyEsc) {
    	// Simple undo
    	const removed = selection[tool].maybePop();
    	if (removed !== undefined) {
    		removed.removeClass('selected');
    	}

    }
});


// Start the application
setupCanvas();
notifySelectableElements();