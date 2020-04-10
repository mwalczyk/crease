export class Vec2 {

	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	normalize() {
		return this.mul(1.0 / this.length());
	}

	dot(other) {
		return this.mul(other).sum();
	}

	distance(other) {
		return this.sub(other).length();
	}

	add(other) {
		// Scalar addition
		if (typeof other === 'number') {
			return new Vec2(this.x + other, this.y + other);
		}

		// Vector (element-wise) addition
		return new Vec2(this.x + other.x, this.y + other.y);
	}

	sub(other) {
		// Scalar subtraction
		if (typeof other === 'number') {
			return new Vec2(this.x - other, this.y - other);
		}

		// Vector (element-wise) subtraction
		return new Vec2(this.x - other.x, this.y - other.y);
	}

	mul(other) {
		// Scalar multiplication
		if (typeof other === 'number') {
			return new Vec2(this.x * other, this.y * other);
		}

		// Vector (element-wise) multiplication
		return new Vec2(this.x * other.x, this.y * other.y);
	}

	div(other) {
		// Scalar division
		if (typeof other === 'number') {
			return new Vec2(this.x / other, this.y / other);
		}

		// Vector (element-wise) division
		return new Vec2(this.x / other.x, this.y / other.y);
	}

	sum() {
		return this.x + this.y;
	}

	midpoint(other) {
		return this.add(other).mul(0.5);
	}
}

class Vec3 {}

class Mat3 {}

class Mat4 {}