export class SelectionGroup {
	
	constructor(expectedVertices, expectedCreases) {
		this.vertices = [];
		this.creases = [];
		this.expectedVertices = expectedVertices;
		this.expectedCreases = expectedCreases;
	}

	maybeAddVertex(v) {
		if (this.vertices.length < this.expectedVertices) {
			this.vertices.push(v);
			return true;
		} 
		return false;
	}

	maybeAddCrease(c) {
		if (this.creases.length < this.expectedCreases) {
			this.creases.push(c);
			return true;
		} 
		return false;
	}

	get mostRecentVertex() {
		return this.vertices[this.vertices.length - 1];
	}

	get mostRecentCrease() {
		return this.creases[this.creases.length - 1];
	}

	get vertexCount() {
		return this.vertices.length;
	}

	get creaseCount() {
		return this.creases.length;
	}

	get isComplete() {
		return this.vertexCount === this.expectedVertices && this.creaseCount == this.expectedCreases;
	}
	
	clear() {
		this.vertices = [];
		this.creases = [];
	}

}