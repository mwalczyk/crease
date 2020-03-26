import { Vec2 } from './math.js';

// Calculates the incenter of the triangle formed by the 3 specified vectors
export function calculateTriangleIncenter(vertexA, vertexB, vertexC) {
	const A = vertexA;
	const B = vertexB;
	const C = vertexC;
	const a = B.distance(C);
	const b = A.distance(C);
	const c = A.distance(B);
	const invP = 1.0 / (a + b + c);

	let incenter = new Vec2(
		(a * A.x + b * B.x + c * C.x) * invP, 
		(a * A.y + b * B.y + c * C.y) * invP, 
	);

	return incenter; 
}

export function calculateLineSegmentIntersection(a, b, c, d) {
	let s1_x = b.x - a.x;  
	let s1_y = b.y - a.y;
	let s2_x = d.x - c.x;   
	let s2_y = d.y - c.y;

    let s = (-s1_y * (a.x - c.x) + s1_x * (a.y - c.y)) / (-s2_x * s1_y + s1_x * s2_y);
    let t = ( s2_x * (a.y - c.y) - s2_y * (a.x - c.x)) / (-s2_x * s1_y + s1_x * s2_y);

    if (s >= 0.0 && s <= 1.0 && t >= 0.0 && t <= 1.0) {
        return new Vec2(a.x + (t * s1_x), a.y + (t * s1_y));
    }

    return null; 
}

export function calculatePerpendicular(lineA, lineB, point) {
	const num = (lineB.y - lineA.y) * (point.x - lineA.x) - (lineB.x - lineA.x) * (point.y - lineA.y);
	const den = Math.pow(lineB.y - lineA.y, 2) + Math.pow(lineB.x - lineA.x, 2);
	const k = num / den;

	return new Vec2(point.x - k * (lineB.y - lineA.y), point.y + k * (lineB.x - lineA.x));
}

// Check if the specified point lies along the specified line segment
export function isOnLineSegment(lineA, lineB, point, eps=0.001) {
	// The length of the specified line segment
	const ab = lineA.distance(lineB);

	// The lengths of the two sub-segments joining each endpoint to the specified point
	const ac = lineA.distance(point);
	const cb = point.distance(lineB);

	// Return `false` if the specified point is one of the endpoints of the line segment
	return Math.abs((ac + cb) - ab) < eps && Math.abs(ac) > eps && Math.abs(cb) > eps;
}

// Finds the index of the vertex that is closest to the specified target vertex 
export function findClosestTo(target, vertices) {
	const distances = vertices.map(v => Math.hypot(v.x - target.x, v.y - target.y));
	const index = distances.indexOf(Math.min.apply(Math, distances));
	const distance = distances[index];

	return [index, distance];
}
