import * as geom from './geometry.js';
import { Vec2 } from './math.js';
import * as utils from './utils.js';

/**
 * A class that represents an embedding of a planar graph
 */
export class PlanarGraph {

	constructor() {
		this.nodes = [];
		this.edges = [];
	}

	/**
	 * @return {number} - the number of nodes in the planar graph
	 */ 
	get nodeCount() {
		return this.nodes.length;
	}

	/**
	 * @return {number} - the number of edges in the planar graph
	 */ 
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
	 * @return {number[]} - the edge at the specified index (2-element array)
	 */
	edgeAt(index) {
		return this.edges[index];
	}

	/**
	 * Attempts to add a new node to the graph at coordinates <node.x, node.y>
	 * @param {Vec2} node - the position of the new node
	 * @param {number} eps - an epsilon (used for numerical stability)
	 * @return {number[][]} - the index of the newly added node (or the index of an existing node if the 
	 *		specified node was close to an existing node) and a list containing the indices of all of the 
	 *		edges that changed as a result of adding the new node
	 */
	addNode(node, eps=0.001) {
		// Check if the vertex is the same as an existing vertex (within epsilon)
		const [index, distance] = geom.findClosestTo(node, this.nodes);

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
			const changedEdges = this.splitEdgesAtNode(this.nodeCount - 1);	
			
			return [this.nodeCount - 1, changedEdges];
		}
	}

	/**
	 * Attempts to add a new edge between the two specified node indices, splitting any intersecting 
	 * edges and adding new nodes and edges as necessary to maintain planarity
	 * @param {number} indexA - the index of the first node
	 * @param {number} indexB - the index of the second node 
	 */
	addEdge(indexA, indexB) {
		// First, push back the new edge
		this.edges.push([indexA, indexB]);

		// Perform line-segment/line-segment intersection tests
		let [changedNodes, changedEdges] = this.splitEdgesAlongEdge(this.edgeCount - 1);

		// If the array of changed edges is empty, this means that no edge splitting was necessary,
		// but we still want to make sure we return at least one edge index (in this case, the edge
		// was simply added at the end of the graph's edge array, so just return that index)
		if (changedEdges.length === 0) {
			changedEdges.push(this.edgeCount - 1);
		}

		return [changedNodes, changedEdges];
	}

	/**
	 * Splits any edges that contain the specified node in their interiors
	 * @param {number} targetIndex - the index of the node to split along
	 * @return {number[]} - the indices of any newly created (or modified) edges
	 */
	splitEdgesAtNode(targetIndex) {
		let changedEdges = [];

		this.edges.forEach((edge, index) => {
			const onEdge = geom.isOnLineSegment(this.nodes[edge[0]],
										   		this.nodes[edge[1]],
										   		this.nodes[targetIndex]);
			if (onEdge) {
				// Create the two new edges
				const childEdgeA = [edge[0], targetIndex];
				const childEdgeB = [edge[1], targetIndex]; 

				// Put one of the new edges in the slot that was previously occupied by the old, 
				// un-split edge and the other at the end of the array - the prior is done so that 
				// we don't have to worry about the rest of the edges being "shuffled" as a result 
				// of a standard array "remove" operation...essentially, we want to add/remove edges
				// in-place
				this.edges[index] = childEdgeA;
				this.edges.push(childEdgeB);
	
				changedEdges.push(index, this.edgeCount - 1);
			}
		});

		return changedEdges;
	}

	/**
	 * Splits any edges that intersect with the specified edge
	 * @param {number} targetIndex - the index of the edge to split along
	 * @return {number[][]} - an array containing two sub-arrays: the first contains the indices of 
	 *		any newly created (or modified) vertices while the second contains the indices of any 
	 *		newly created (or modified) edges
	 */
	splitEdgesAlongEdge(targetIndex) {
		let changedNodes = [];
		let changedEdges = [];

		// An array containing all of the points of intersections
		let intersections = [];

		this.edges.forEach((edge, index) => {

			if (targetIndex !== index) {
				// The point of intersection (or null if no intersection is found)
				const intersection = geom.calculateLineSegmentIntersection(
					this.nodes[edge[0]],
					this.nodes[edge[1]],
					this.nodes[this.edges[targetIndex][0]],
					this.nodes[this.edges[targetIndex][1]]
				);
				if (intersection) {
					intersections.push(intersection);
					//console.log(`Found intersection between edge ${targetIndex} and edge ${index}`);
				}
			}
		});

		intersections.forEach(intersection => {
			// Add a new node at the point of intersection, which returns a node index and a list 
			// of all of the edge indices that changed as a result of the additional node
			const [nodeIndex, edgeIndices] = this.addNode(intersection);

			changedNodes.push(nodeIndex);
			changedEdges = changedEdges.concat(edgeIndices);
		});

		return [changedNodes, changedEdges];
	}

	removeNode(targetIndex) {
		// Put the last node in the position of the node to-be-deleted
		this.nodes[targetIndex] = this.nodes[this.nodeCount - 1];

		// Any edge that points to the last node needs to be reconfigured, as that node was just moved
		// this.edges.forEach((edge, index) => {
		// 	const foundIndex = edge.findIndex(node => node === this.nodeCount - 1);
		// 	if (foundIndex > -1) {
		// 		this.edges[index][foundIndex] = targetIndex;
		// 		console.log(`Edge shuffle for target index ${targetIndex} and ${this.nodeCount - 1}: ${edge}`)
		// 	}
		// });
		let changedNodes = [targetIndex, this.nodeCount - 1];

		// Remove the last node, which is now a duplicate entry
		this.nodes.pop();

		// Remove any edges that point to the deleted node
		let [strayNodes, changedEdges] = this.removeEdgesIncidentToNode(targetIndex);
		console.log('Changed edges', changedEdges)
		console.log('Stray nodes:', strayNodes)



		return [changedNodes, changedEdges];	
	}

	removeEdgesIncidentToNode(targetIndex) {
		let markedNodes = [];
		let markedEdges = [];

		this.edges.forEach((edge, index) => {
			// Does this edge start (or end) at the specified node?
			if (edge.includes(targetIndex)) {

				markedEdges.push(index);

				// Deleting an edge may result in a "floating" stray node, which needs to be deleted as well
				edge.forEach(node => {
					if (this.isStrayNode(node) && node !== targetIndex) {
						markedNodes.push(node);
					}
				})
			}

		});

		// Remove all invalid edges simultaneously simultaneously
		this.edges = utils.removeValuesAtIndices(this.edges, markedEdges); 

		// Remove all invalid (stray) vertices simultaneously
		// ...

		// Return the indices of the nodes / edges that now occupy the positions leftover
		// by the removed objects (plus the indices that we just used for removal?)
		// ...

		return [markedNodes, markedEdges];
	}

	isStrayNode(targetIndex) {
		return !this.edges.some(edge => edge.includes(targetIndex));
	}
}