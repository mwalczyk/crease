const snapsvg = require('snapsvg')

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
//
// To run:
//
// 		watchify index.js -o bundle.js
//

// Create the `Element` object that will house all of the other SVGs
console.log('Starting application...');
const s = Snap('#svg');
const w = s.attr().width;
const h = s.attr().height;
console.log(`SVG size: ${w} x ${h}`);

const creaseAssignment = {
	MOUNTAIN: 'M',
	VALLEY: 'V',
	BORDER: 'B',
	UNKNOWN: 'U'
}

const vertexType = {
	GRID: 'grid',
	ACTIVE: 'active'
}

// switch (a) {
// 	case assignment.MOUNTAIN:
// 	case assignment.VALLEY:
// 	case assignment.BORDER:
// 	case assignment.UNKNOWN
// }

// Stuff
let dragging = false;
let vertices = [];
let creases = [];

// Create the grid
let gridDivsX = 5;
let gridDivsY = 5;
const vertexDrawRadius = 6;

function deselectAllVertices() {
	s.selectAll('.vertex').forEach(el => el.removeClass('vertex-selected'));
}

// Finds the index of the vertex that is closest to the specified 
// coordinates 
//
// TODO: use `Snap.path.isPointInsideBBox(bbox, x, y)` instead?
function findClosestVertexTo(x, y) {
	// We do this because `selectAll()` actually returns an `HTMLCollection` 
	// object, not an array
	const vertices = Array.from(s.selectAll('.vertex'));
	const distances = vertices.map(el => {
    	return Math.hypot(el.getBBox().cx - x, el.getBBox().cy - y)
	});
	const index = distances.indexOf(Math.min.apply(Math, distances));
	const distance = distances[index];

	return [index, distance];
}

// Vertex callback functions
let callbackVertexClicked = function() {
	deselectAllVertices();
	this.addClass('vertex-selected');
}
let callbackVertexHoverEnter = function() {
	this.attr({'r': vertexDrawRadius * 1.5});
}
let callbackVertexHoverExit = function() {
	this.attr({'r': vertexDrawRadius});
}
let callbackVertexDragMove = function(dx, dy, x, y) {
	creases[creases.length - 1].attr({
		'x2': this.getBBox().cx + dx, 
		'y2': this.getBBox().cy + dy
	});
}
let callbackVertexDragStart = function() {
	console.log('Starting drag...')

	let crease = s.line(this.getBBox().cx, 
						this.getBBox().cy, 
						this.getBBox().cx, 
						this.getBBox().cy);

	crease.addClass('crease');
	creases.push(crease);
}
let callbackVertexDragStop = function() {
	console.log('Ending drag...')

	const threshold = 20;
	const [index, distance] = findClosestVertexTo(
		creases[creases.length - 1].attr().x2,
		creases[creases.length - 1].attr().y2
	);

	if (distance < threshold) {
		console.log(`Connecting to vertex: ${index}`);
		const vertices = Array.from(s.selectAll('.vertex'));
		creases[creases.length - 1].attr({
			'x2': vertices[index].getBBox().cx,
			'y2': vertices[index].getBBox().cy
		});
	} else {
		console.log('Failed to connect line to vertex...deleting');
		let activeCrease = creases.pop();
		activeCrease.remove();
	}
}

function constructGrid() {
	//
	vertices = vertices.filter(v => {
		// Remove the SVG element
		if (v.data('type') == vertexType.GRID) {
			v.remove();
			return false;
		} else {
			return true;
		}
	});

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

			let vertex = s.circle(posX, posY, vertexDrawRadius);
			vertex.data('type', vertexType.GRID)
			vertex.hover(callbackVertexHoverEnter, callbackVertexHoverExit);
			vertex.click(callbackVertexClicked);
			vertex.drag(callbackVertexDragMove, callbackVertexDragStart, callbackVertexDragStop);
			vertex.addClass('vertex');

			vertices.push(vertex)
		}
	}
}

const slider = document.getElementById('divisions');

slider.onchange = function() {
    gridDivsX = this.value;
    gridDivsY = this.value;
    constructGrid();
};

constructGrid();

// let line = s.line(0, 0, w, h);

// line.attr({
// 	fill: 'coral',
// 	stroke: 'coral',
// 	strokeWidth: 10
// });

