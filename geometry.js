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
	let s1_x;
	let s1_y;
	let s2_x;
	let s2_y;
    s1_x = b.x - a.x;     
    s1_y = b.y - a.y;
    s2_x = d.x - c.x;     
    s2_y = d.y - c.y;

    let s = (-s1_y * (a.x - c.x) + s1_x * (a.y - c.y)) / (-s2_x * s1_y + s1_x * s2_y);
    let t = ( s2_x * (a.y - c.y) - s2_y * (a.x - c.x)) / (-s2_x * s1_y + s1_x * s2_y);

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1)
    {
        return new Vec2(a.x + (t * s1_x), a.y + (t * s1_y));
    }

    return null; 
}