import { Vec2 } from './math.js';

/**
 * Determines whether a triangle is degenerate (i.e. has one or more sides with length 0)
 * @param {Vec2} a - the first point
 * @param {Vec2} b - the second point
 * @param {Vec2} c - the third point
 * @return {boolean} - whether or not the specified triangle is degenerate
 */
export function isDegenerateTriangle(a, b, c, eps=0.001) {
	const A = b.distance(c);
	const B = a.distance(c);
	const C = a.distance(b);
	if (Math.abs(A) < eps || Math.abs(B) < eps || Math.abs(C) < eps) {
		return true;
	}
	return false;
}

/**
 * Calculates the incenter of the triangle formed by 3 points
 * @param {Vec2} a - the first point
 * @param {Vec2} b - the second point
 * @param {Vec2} c - the third point
 * @return {Vec2} - the incenter of the triangle or null if the triangle is degenerate
 */
export function calculateTriangleIncenter(a, b, c) {
	if (isDegenerateTriangle(a, b, c)) {
		return null;
	}
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
 * @return {Vec2} - the point of intersection or null if no intersection is found
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
export function calculatePerpendicularPoint(a, b, p) {
	const numer = (b.y - a.y) * (p.x - a.x) - (b.x - a.x) * (p.y - a.y);
	const denom = Math.pow(b.y - a.y, 2.0) + Math.pow(b.x - a.x, 2.0);
	const k = numer / denom;

	return new Vec2(p.x - k * (b.y - a.y), p.y + k * (b.x - a.x));
}

export function calculatePerpendicularBisector(a, b, offset=1.0) {
	// First, calculate the midpoint of the line segment from a to b
	const midpoint = a.midpoint(b);

	// Then, calculate the slope of the line segment and the slope of the perpendicular
	const slope = (b.y - a.y) / (b.x - a.x);
	const slope_perpendicular = -1 / slope;
	const intercept = midpoint.y - slope_perpendicular * midpoint.x; 

	// Add a small offset in the x-direction (this is arbitrary)
	const offsetPoint = midpoint.add(new Vec2(offset, 0.0));

	const second = new Vec2(offsetPoint.x,
							offsetPoint.x * slope_perpendicular + intercept);

	return [midpoint, second];
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

export function getLineEquation(a, b) {
	const slope = (b.y - a.y) / (b.x - a.x);
	const intercept = a.y - slope * a.x;
	return [slope, intercept];
}

/**
 * Calculates the point of intersection between two infinite lines
 * @param {Vec2} a - the first point on the first line
 * @param {Vec2} b - the second point on the first line
 * @param {Vec2} c - the first point on the second line
 * @param {Vec2} d - the second point on the second line
 * @param {number} eps - an epsilon (used for numerical stability)
 * @return {Vec2} - the point of intersection (or null if no intersection is found)
 */
export function calculateLineIntersection(a, b, c, d, eps=0.001) {
	const determinant = (d.y - c.y) * (b.x - a.x) - (d.x - c.x) * (b.y - a.y);
    
    if (Math.abs(determinant) > eps) {
       	const uA = ((d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x)) / determinant;
        const uB = ((b.x - a.x) * (a.y - c.y) - (b.y - a.y) * (a.x - c.x)) / determinant;

        if (!(0 <= uA <= 1 && 0 <= uB <= 1)) {
        	return null;
        }

		const x = a.x + uA * (b.x - a.x);
		const y = a.y + uA * (b.y - a.y);

		return new Vec2(x, y);
    } 
    return null;
}

/**
 * Calculates the (sub)set of "unique" points from an input set, within epsilon
 * @param {Vec2[]} ps - the input points
 * @param {number} eps - an epsilon (used for numerical stability)
 * @return {Vec2[]} - the unique points among the input set
 */
export function uniquePointsAmong(ps, eps=0.001) {
	let unique = [];

	ps.forEach(a => {
		let isUnique = true;

		unique.forEach(b => {
			if (closeTo(a, b)) {
				isUnique = false;
			}
		});

		if (isUnique) {
			unique.push(a);
		}
	});

	return unique;
}