export class SelectionGroup {
	
	constructor(expectedVertices, expectedCreases, verticesFirst=true, help='Message') {
		this.vertices = [];
		this.creases = [];
		this.expectedVertices = expectedVertices;
		this.expectedCreases = expectedCreases;
		this.verticesFirst = verticesFirst;
		this.help = help;
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

	get hasRequiredVertices() {
		return this.vertexCount === this.expectedVertices;
	}

	get hasRequiredCreases() {
		return this.creaseCount == this.expectedCreases;
	}

	get isComplete() {
		return this.hasRequiredVertices && this.hasRequiredCreases;
	}

	clear() {
		this.vertices = [];
		this.creases = [];
	}

}