export class SelectionGroup {
	constructor(selector, count) {
		this.selector = selector;
		this.count = count;
		this.refs = [];
	}

	maybeAdd(element) {
		if (element.hasClass(this.selector) && this.refs.length < this.count) {
			this.refs.push(element);
			return true;
		} 
		return false;
	}

	clear() {
		this.refs = [];
	}

	get isComplete() {
		return this.refs.length === this.count;
	}
}

export class OrderedSelection {
	constructor(groups, help='') {
		this.groups = groups;
		this.currentIndex = 0;
	}

	maybeAdd(element) {
		const res = this.currentGroup.maybeAdd(element);
		if (!res) {
			this.advance();
		}
		return res;
	}
	
	advance() {
		this.currentIndex = Math.min(this.currentIndex + 1, this.groups.length - 1);
	}

	clear() {
		this.groups.forEach(g => g.clear());
	}

	get currentGroup() {
		return this.groups[this.currentIndex];
	}

	get isComplete() {
		return this.currentIndex === (this.groups.length - 1) && this.groups[this.groups.length - 1].isComplete();
	}
}

// export class SelectionGroup {
	
// 	constructor(expectedVertices, expectedCreases, verticesFirst=true, help='Message') {
// 		this.vertices = [];
// 		this.creases = [];
// 		this.expectedVertices = expectedVertices;
// 		this.expectedCreases = expectedCreases;
// 		this.verticesFirst = verticesFirst;
// 		this.help = help;
// 	}

// 	maybeRecordVertex(v) {
// 		if (this.vertices.length < this.expectedVertices) {
// 			this.vertices.push(v);
// 			return true;
// 		} 
// 		return false;
// 	}

// 	maybeRecordCrease(c) {
// 		if (this.creases.length < this.expectedCreases) {
// 			this.creases.push(c);
// 			return true;
// 		} 
// 		return false;
// 	}

// 	get mostRecentVertex() {
// 		return this.vertices[this.vertices.length - 1];
// 	}

// 	get mostRecentCrease() {
// 		return this.creases[this.creases.length - 1];
// 	}

// 	get vertexCount() {
// 		return this.vertices.length;
// 	}

// 	get creaseCount() {
// 		return this.creases.length;
// 	}

// 	get hasRequiredVertices() {
// 		return this.vertexCount === this.expectedVertices;
// 	}

// 	get hasRequiredCreases() {
// 		return this.creaseCount == this.expectedCreases;
// 	}

// 	get isComplete() {
// 		return this.hasRequiredVertices && this.hasRequiredCreases;
// 	}

// 	clear() {
// 		this.vertices = [];
// 		this.creases = [];
// 	}

// }