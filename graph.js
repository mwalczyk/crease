import { Vec2 } from './math.js'
import { calculateLineSegmentIntersection } from './geometry.js';

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

		this.edges.forEach((edge, index) => {
			const intersection = calculateLineSegmentIntersection(
				this.vertices[edge[0]],
				this.vertices[edge[1]],
				this.vertices[a],
				this.vertices[b]
			);

			if (intersection) {

				// Is the intersection point an endpoint? If so, we should ignore the next steps
				// ...

				// Split edge

				console.log(`Found intersection between new edge and edge ${index}`);
			}
		})

		this.edges.push([a, b]);
	}

	deleteVertex(index) {
		// First, remove the vertex at the specified index
		this.vertices.splice(index, 1);

		// Then, delete any edges that contain the removed vertex 
		this.deleteEdgesWithVertex(index);

		Finally, rebuild existing edges
		this.edges.forEach((e, i) => {
			if this.edges[i][0] > index {
				this.edges[i][0]--;
			}
			if this.edges[i][1] > index {
				this.edges[i][1]--;
			}
		});
	}

	deleteEdgesWithVertex(index) {
		this.edges = this.edges.filter(e => !e.includes(index));
	}

}