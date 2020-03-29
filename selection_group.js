export class SelectionGroup {
	constructor(classes, count) {
		this.classes = classes;
		this.count = count;
		this.refs = [];
	}

	isApplicable(element) {
		return this.classes.some(c => element.node.classList.contains(c));
	}

	maybeAdd(element) {
		if (this.isApplicable(element) && this.refs.length < this.count) {
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
		this.currentIndex = 0;
	}

	get currentGroup() {
		return this.groups[this.currentIndex];
	}

	get isComplete() {
		return this.currentIndex === (this.groups.length - 1) && this.groups[this.groups.length - 1].isComplete;
	}
}
