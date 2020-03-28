import { Vec2 } from './math.js'
import { calculateLineSegmentIntersection, isOnLineSegment, findClosestTo } from './geometry.js';

// A class that represents an embedding of a planar graph
export class PlanarGraph {

	constructor() {
		this.nodes = [];
		this.edges = [];
	}

	get nodeCount() {
		return this.nodes.length;
	}

	get edgeCount() {
		return this.edges.length;
	}

	nodeAt(index) {
		return this.nodes[index];
	}

	edgeAt(index) {
		return this.edges[index];
	}

	// Potentially adds a new node to the graph, where the node is represented by a 2-element
	// vector (with xy-coordinates)
	//
	// Returns a list with two entries:
	// 1) The index of the newly added node or the index of an existing node if the specified
	//    node was the same (or very close to) an existing node
	// 2) A list containing the indices of all of the edges that changed as a result of adding
	//    the new node
	addNode(node, epsilon=0.001) {
		// Check if the vertex is the same as an existing vertex (within epsilon)
		const [indexOfClosest, distanceToClosest] = findClosestTo(node, this.nodes);

		// If the found distance is less than the specified threshold, the specified
		// node is considered a "duplicate," so we return the index of the existing
		// node
		//
		// Otherwise, this is truly a new node, so we add it to the list of nodes
		// and return its index
		if (distanceToClosest < epsilon) {
			console.log(`Added node is very close to neighbor ${indexOfClosest} - returning existing index`)
			return [indexOfClosest, []];
		} else {
			this.nodes.push(node);
			const modifiedEdges = this.splitEdgesAlong(this.nodeCount - 1);	

			// The new node is added at the end of the list, so we return that index along 
			// with any edges that may have changed / been created
			return [this.nodeCount - 1, modifiedEdges];
		}
	}

	// Splits any edges that contain the specified node in their interiors - we do not need
	// to split an edge when the specified node is one of its endpoints
	splitEdgesAlong(nodeIndex) {
		let changedEdges = [];

		this.edges.forEach((edge, index) => {
			const onEdge = isOnLineSegment(this.nodes[edge[0]],
										   this.nodes[edge[1]],
										   this.nodes[nodeIndex]);
			if (onEdge) {
				// Create the two new edges
				const childEdgeA = [this.edges[index][0], nodeIndex];
				const childEdgeB = [this.edges[index][1], nodeIndex]; 

				// Put one of them in the place of the old, un-split edge and the other 
				// at the end of the array
				this.edges[index] = childEdgeA;
				this.edges.push(childEdgeB);
	
				changedEdges.push(index, this.edgeCount - 1);
			}
		});

		return changedEdges;
	}



	// Adds an edge between the nodes at indices `a` and `b` and splits any intersecting
	// edges, adding new nodes and edges as necessary to maintain planarity
	addEdge(a, b) {

		// First, push back the new edge
		this.edges.push([a, b]);

		// let invalidEdges = [];
		// let updatedEdges = [];
		// this.edges.forEach((edge, index) => {
		// 	const intersection = calculateLineSegmentIntersection(
		// 		this.nodes[edge[0]],
		// 		this.nodes[edge[1]],
		// 		this.nodes[a],
		// 		this.nodes[b]
		// 	);

		// 	if (intersection) {

		// 		// If the new edge intersects (or touches) an existing edge, we need
		// 		// to split that edge, removing the original "unsplit" edge, and pushing
		// 		// back the two new subdivisions


		// 		console.log(`Found intersection between new edge and edge ${index}`);
		// 	}
		// });

		return this.edgeCount - 1;
	}

	deleteNode(index) {
		// First, remove the vertex at the specified index
		this.nodes.splice(index, 1);

		// Then, delete any edges that contain the removed vertex 
		this.deleteEdgesWithVertex(index);

		let changedEdges = [];

		// TODO: ...

		return changedEdges;	
	}

	deleteEdgesWithNode(index) {
		this.edges = this.edges.filter(e => !e.includes(index));
	}

}