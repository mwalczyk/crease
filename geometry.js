import { Vec2 } from './math.js';

/**
 * Calculates the incenter of the triangle formed by 3 points
 * @param {Vec2} a - the first point
 * @param {Vec2} b - the second point
 * @param {Vec2} c - the third point
 */
export function calculateTriangleIncenter(a, b, c) {
	const A = b.distance(c);
	const B = a.distance(c);
	const C = a.distance(b);
	const invP = 1.0 / (A + B + C);
	let incenter = new Vec2((A * a.x + B * b.x + C * c.x) * invP, 
							(A * a.y + B * b.y + C * c.y) * invP);
	return incenter; 
}

/**
 * Calculates the intersection between two line segments or `null` if they do not intersect
 * @param {Vec2} a - the start of the first line segment
 * @param {Vec2} b - the end of the first line segment
 * @param {Vec2} c - the start of the second line segment
 * @param {Vec2} d - the end of the second line segment
 */
export function calculateLineSegmentIntersection(a, b, c, d) {
	const deltaX0 = b.x - a.x;  
	const deltaY0 = b.y - a.y;
	const deltaX1 = d.x - c.x;   
	const deltaY1 = d.y - c.y;
	const denom = (-deltaX1 * deltaY0 + deltaX0 * deltaY1);

    const s = (-deltaY0 * (a.x - c.x) + deltaX0 * (a.y - c.y)) / denom;
    const t = ( deltaX1 * (a.y - c.y) - deltaY1 * (a.x - c.x)) / denom;

    if (s >= 0.0 && s <= 1.0 && t >= 0.0 && t <= 1.0) {
        return new Vec2(a.x + (t * deltaX0), a.y + (t * deltaY0));
    }

    return null; 
}

/**
 * Calculates the perpendicular on a line from a given point
 * @param {Vec2} a - the start of the line segment
 * @param {Vec2} b - the end of the line segment
 * @param {Vec2} p - the point to drop a perpendicular from  
 */
export function calculatePerpendicular(a, b, p) {
	const numer = (b.y - a.y) * (p.x - a.x) - (b.x - a.x) * (p.y - a.y);
	const denom = Math.pow(b.y - a.y, 2.0) + Math.pow(b.x - a.x, 2.0);
	const k = numer / denom;

	return new Vec2(p.x - k * (b.y - a.y), p.y + k * (b.x - a.x));
}

/**
 * Check if the specified point lies along the specified line segment
 * @param {Vec2} a - the start of the line segment
 * @param {Vec2} b - the end of the line segment
 * @param {Vec2} p - the point to test 
 * @param {boolean} includeEndpoints - whether or not a point at either of the endpoints should be considered
 * @param {number} eps - an epsilon (used for numerical stability)
 */
export function isOnLineSegment(a, b, p, includeEndpoints=false, eps=0.001) {
	// The total length of the line segment
	const ab = a.distance(b);

	// The lengths of the two sub-segments joining each endpoint to the specified point
	const ac = a.distance(p);
	const cb = p.distance(b);

	// Return `false` if the specified point is one of the endpoints of the line segment
	return Math.abs((ac + cb) - ab) < eps && Math.abs(ac) > eps && Math.abs(cb) > eps;
}

/**
 * Finds the index of the vertex that is closest to the specified target vertex 
 * @param {Vec2} t - the target vertex
 * @param {Vec2[]} ps - the array of vertices to test against
 */
export function findClosestTo(t, ps) {
	const distances = ps.map(v => Math.hypot(v.x - t.x, v.y - t.y));
	const index = distances.indexOf(Math.min.apply(Math, distances));
	const distance = distances[index];

	return [index, distance];
}

/**
 * Determines whether the specified points are "close to" each other, i.e. the same
 * @param {Vec2} a - the first point
 * @param {Vec2} b - the second point
 * @param {number} eps - an epsilon (used for numerical stability)
 */
export function closeTo(a, b, eps=0.001) {
	return Math.abs(a.distance(b)) < eps;
}
