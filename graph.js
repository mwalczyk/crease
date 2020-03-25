import { Vec2 } from './math.js'

export class PlanarGraph {
	// An embedding of a planar graph

	constructor() {
		this.vertices = [];
		this.edges = [];
	}

	// Adds a vertex (represented as a 2-element vector) with coordinates (x, y)
	addVertex(vertex) {
		this.vertices.push(vertex);
	}

	// Adds an edge between the vertices at index `a` and `b`
	addEdge(a, b) {
		this.edges.push([a, b])
	}

	deleteVertices(indices) {

		this.vertices = this.vertices.filter((v, i) => !indices.includes(i));

		// Delete vertex "4":

		// Vertices:
		// 0 1 2 3 4 5 ...

		// Edges:
		// [0, 4]
		// [4, 9]
		// ...
		indices.forEach(i => {
			this.vertices.splice(i, 1);


		})
	}

	deleteVertex(index) {
		// First, remove the vertex at the specified index
		this.vertices.splice(index, 1);

		// Then, delete any edges that contain the removed vertex 
		this.deleteEdgesWithVertex(index);

		// Finally, rebuild existing edges
		// this.edges.forEach((e, i) => {
		// 	if this.edges[i][0] > index {
		// 		this.edges[i][0]--;
		// 	}
		// 	if this.edges[i][1] > index {
		// 		this.edges[i][1]--;
		// 	}
		// });
	}

	deleteEdgesWithVertex(index) {
		this.edges = this.edges.filter(e => !e.includes(index));
	}

}