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

	/**
	 * @param {number} index - a node index
	 * @return {Vec2} - the node at the specified index
	 */
	nodeAt(index) {
		return this.nodes[index];
	}

	/**
	 * @param {number} index - an edge index
	 * @return {number[]} - the edge at the specified index
	 */
	edgeAt(index) {
		return this.edges[index];
	}

	/**
	 * Attempts to add a new node to the graph at coordinates <node.x, node.y>
	 * @param {Vec2} node - the position of the new node
	 * @param {number} eps - an epsilon (used for numerical stability)
	 * @return {[number, number[]]} - the index of the newly added node (or the index of an existing
	 * 		node if the specified node was close to an existing node) and a list containing the indices
	 *		of all of the edges that changed as a result of adding the new node
	 */
	addNode(node, eps=0.001) {
		// Check if the vertex is the same as an existing vertex (within epsilon)
		const [index, distance] = findClosestTo(node, this.nodes);

		if (distance < eps) {
			// If the found distance is less than the specified threshold, the specified
			// node is considered a "duplicate," so we return the index of the existing
			// node
			console.log(`Attempting to add node that is very close node at index ${index} - returning the existing index instead`);
			return [index, []];
		} else {
			// The new node is added at the end of the list, so we return that index along 
			// with any edges that may have changed / been created
			this.nodes.push(node);
			const changedEdges = this.splitEdgesAlong(this.nodeCount - 1);	
			
			return [this.nodeCount - 1, changedEdges];
		}
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

	/**
	 * Splits any edges that contain the specified node in their interiors
	 * @param {number} index - the position of the new node
	 * @return {number[]} - the indices of any newly created (or modified) edges
	 */
	splitEdgesAlong(nodeIndex) {
		let changedEdges = [];

		this.edges.forEach((edge, edgeIndex) => {
			const onEdge = isOnLineSegment(this.nodes[edge[0]],
										   this.nodes[edge[1]],
										   this.nodes[nodeIndex]);
			if (onEdge) {
				// Create the two new edges
				const childEdgeA = [edge[0], nodeIndex];
				const childEdgeB = [edge[1], nodeIndex]; 

				// Put one of them in the place of the old, un-split edge and the other 
				// at the end of the array
				this.edges[edgeIndex] = childEdgeA;
				this.edges.push(childEdgeB);
	
				changedEdges.push(edgeIndex, this.edgeCount - 1);
			}
		});

		return changedEdges;
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