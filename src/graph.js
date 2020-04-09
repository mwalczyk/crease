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
	 * @param {number} index - a node index
	 * @return {number} - the number of edges that touch (i.e. include) the specified node
	 */
	numberOfEdgesIncidentTo(index) {
		return this.edges.filter(edge => edge.includes(index)).length;
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
	splitEdgesAtNode(targetIndex, eps=0.001) {
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
	 *		any newly created (or modified) nodes, while the second contains the indices of any newly 
	 *		created (or modified) edges
	 */
	splitEdgesAlongEdge(targetIndex, eps=0.001) {
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
					console.log(`Found intersection between edge ${targetIndex} and edge ${index}`);
				}
			}
		});

		// Get rid of duplicate intersection points - this happens, for example, when the target
		// edge passes through a node that is the shared endpoint of multiple neighbor edges
		intersections = geom.uniquePointsAmong(intersections);
		console.log(`Found ${intersections.length} unique intersections`);

		intersections.forEach(intersection => {
			// One annoying edge-case we have to consider here is, what happens when the point of 
			// intersection coincides (i.e. overlaps with) an existing node? In this case, we want
			// to split any offending edges along the existing node and continue. Otherwise, the 
			// point of intersection should be considered a new node, so we add it and split along
			// any edges, as necessary.
			const [index, distance] = geom.findClosestTo(intersection, this.nodes);

			if (distance < eps) {
				console.log('Point of intersection coincides with an existing node');
				changedEdges = changedEdges.concat(this.splitEdgesAtNode(index));
			} else {
				// Add a new node at the point of intersection, which returns a node index and a list 
				// of all of the edge indices that changed as a result of the additional node
				const [nodeIndex, edgeIndices] = this.addNode(intersection);

				changedNodes.push(nodeIndex);
				changedEdges = changedEdges.concat(edgeIndices);
			}
		});

		return [changedNodes, changedEdges];
	}


	/**
	 * Removes an edge from the planar graph, potentially removing any stray nodes as well
	 * @param {number} targetIndex - the index of the edge to remove
	 * @return {number[][]} - an array containing two sub-arrays: the first contains the indices of
	 * 		any removed (or modified) nodes, while the second contains the indices of any removed 
	 *		(or modified) edges
	 */
	removeEdge(targetIndex) {
		if (targetIndex < 0 || targetIndex > this.edgeCount) {
			console.error('Attempting to remove an edge at an invalid index');
		}

		const [indexA, indexB] = this.edges[targetIndex];

		// If either of this edge's endpoints would be stray nodes upon this edge's deletion,
		// we can simply re-use the node deletion procedure below, which will remove this edge
		// as a side effect
		if (this.numberOfEdgesIncidentTo(indexA) === 1) {
			return this.removeNode(indexA);
		} else if (this.numberOfEdgesIncidentTo(indexB) === 1) {
			return this.removeNode(indexB);
		} 

		// Otherwise, both of the endpoints of this edge are also part of some other edges, so 
		// we can simply delete the edge itself
		let changedNodes = [];
		let changedEdges = [targetIndex];

		// If there is at least one other edge besides this one, replace the edge to-be-deleted
		// with the last edge and return both indices - doing this prevents the entire array from
		// being shuffled
		if (this.edgeCount > 1) {
			this.edges[targetIndex] = this.edges[this.edgeCount - 1];
			changedEdges.push(this.edgeCount - 1);
			this.edges.pop();
		}

		return [changedNodes, changedEdges];	
	}

	/**
	 * Removes a node and any incident edges from the planar graph, potentially removing any extra  
	 * stray nodes as well
	 * @param {number} targetIndex - the index of the node to remove
	 * @return {number[][]} - an array containing two sub-arrays: the first contains the indices of
	 * 		any removed (or modified) nodes, while the second contains the indices of any removed 
	 *		(or modified) edges
	 */
	removeNode(targetIndex) {
		if (targetIndex < 0 || targetIndex > this.nodeCount) {
			console.error('Attempting to remove a node at an invalid index');
		}

		// This list will contain the indices of all of the nodes that need to be deleted
		let markedNodes = [targetIndex];

		// Remove any edges that point to the deleted node
		let [strayNodes, markedEdges] = this.removeEdgesIncidentToNode(targetIndex);
		markedNodes = markedNodes.concat(strayNodes);
 

		// A dictionary from "old" to "new" node indices - the node in the 5th position of the 
		// array, for example, will shift downwards some amount if we delete nodes before it, and 
		// this data structure captures those relationships for all nodes that are still present
		// after the deletion operation
		let remappedNodes = {};

		this.nodes.forEach((node, index) => {
			// If this node was not marked for deletion, its new index in the array will be its
			// current position minus the number of to-be-deleted nodes that come *before* it in 
			// the array
			if (!markedNodes.includes(index)) {
				const back = markedNodes.filter(entry => entry < index).length;
				remappedNodes[index] = index - back;
			}
		});

		// Keep track of the index of the "leftmost" node / edge to-be-deleted
		const minNodeIndex = Math.min(...markedNodes);
		const minEdgeIndex = Math.min(...markedEdges);

		// All nodes / edges that are to the right of the indices calculated above will change
		let changedNodes = utils.indexRange(minNodeIndex, this.nodeCount);
		let changedEdges = utils.indexRange(minEdgeIndex, this.edgeCount);

		const debug = false;
		if (debug) {
			console.log('Nodes marked for deletion:', markedNodes);
			console.log('Edges marked for deletion:', markedEdges);
			console.log('Min node index:', minNodeIndex);
			console.log('Min edge index:', minEdgeIndex);
			console.log('Remapped node indices:', remappedNodes);
			console.log('Changed nodes:', changedNodes);
			console.log('Changed edges:', changedEdges);
		}

		// Perform the actual deletion operation
		this.nodes = utils.removeValuesAtIndices(this.nodes, markedNodes); 
		this.edges = utils.removeValuesAtIndices(this.edges, markedEdges); 

		// Update any edges that pointed to nodes that were shuffled / moved as a result
		// of the deletion procedure
		let keys = Object.keys(remappedNodes).map(entry => parseInt(entry));

		this.edges.forEach((edge, index) => {
			// The indices of the start + end nodes that form this edge
			const [indexA, indexB] = edge;
			
			// If the dictionary of "old" to "new" node indices contains either of this edge's
			// endpoints, update those indices to reflect the new graph structure
			if (keys.includes(indexA)) {
				this.edges[index][0] = remappedNodes[indexA];
			}
			if (keys.includes(indexB)) {
				this.edges[index][1] = remappedNodes[indexB];
			}

		});
		
		return [changedNodes, changedEdges];	
	}

	/**
	 * Finds the indices of all of the edges (and stray nodes) that should be marked for deletion after
	 * removing the specified node - note that this function doesn't actually perform the deletion of 
	 * any of these objects
	 * @param {number} targetIndex - the index of the node that will be deleted
	 * @return {number[][]} - an array containing two sub-arrays: the first contains the indices of 
	 *		any stray nodes that should be marked for deletion, the second contains the indices of any
	 * 		edges that should be marked for deletion
	 */
	removeEdgesIncidentToNode(targetIndex) {
		let markedNodes = [];
		let markedEdges = [];

		this.edges.forEach((edge, index) => {
		
			if (edge.includes(targetIndex)) {
				// This edge should be marked for deletion, as it contains the node that we want to delete
				markedEdges.push(index);

				// Deleting an edge may result in a "floating" stray node, which needs to be deleted as well -
				// this is the edge's other node (i.e. not the one that is already marked for deletion)
				let neighbor = edge[1 - edge.indexOf(targetIndex)];

				// Is there another edge (other than this one) that includes the specified node? If not, it 
				// is a "stray" node
				if (this.edges.filter(other => other.includes(neighbor)).length === 1) {
					markedNodes.push(neighbor);
				}
			}

		});

		return [markedNodes, markedEdges];
	}

}