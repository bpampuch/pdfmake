import { PDFDocument as PDFKitDocument } from 'pdfkit';

class PathMeasure {
	constructor() {
		this.x = this.y = this.startX = this.startY = 0;
		this.width = this.height = -Infinity;
	}

	moveTo(x, y) {
		this.x = this.startX = x;
		this.y = this.startY = y;
		return this;
	}

	lineTo(x, y) {
		this.width = Math.max(this.width, this.x, x);
		this.height = Math.max(this.height, this.y, y);
		this.x = x;
		this.y = y;
		return this;
	}

	closePath() {
		this.x = this.startX;
		this.y = this.startY;
		return this;
	}

	bezierCurveTo(x1, y1, x2, y2, x, y) {
		this.width = Math.max(this.width, cubicMax(this.x, x1, x2, x));
		this.height = Math.max(this.height, cubicMax(this.y, y1, y2, y));
		return this.lineTo(x, y);
	}
}

/**
 * @param {number} p0
 * @param {number} p1
 * @param {number} p2
 * @param {number} p3
 * @returns {number}
 */
function cubicMax(p0, p1, p2, p3) {
	// The extrema of a cubic Bezier curve are the roots of its derivative.
	const a = -p0 + 3 * p1 - 3 * p2 + p3;
	const b = 2 * (p0 - 2 * p1 + p2);
	const c = p1 - p0;
	let roots = [];
	if (a === 0) {
		if (b !== 0) {
			roots.push(-c / b);
		}
	} else {
		const discriminant = b * b - 4 * a * c;
		if (discriminant >= 0) {
			const sqrt = Math.sqrt(discriminant);
			roots.push((-b + sqrt) / (2 * a), (-b - sqrt) / (2 * a));
		}
	}
	let max = Math.max(p0, p3);
	for (const t of roots) {
		if (t > 0 && t < 1) {
			const s = 1 - t;
			max = Math.max(max, s * s * s * p0 + 3 * s * s * t * p1 + 3 * s * t * t * p2 + t * t * t * p3);
		}
	}
	return max;
}

/**
 * @param {string} path
 * @returns {object}
 */
export default function measurePath(path) {
	const measure = new PathMeasure();
	PDFKitDocument.prototype.path.call(measure, path);
	return {
		width: measure.width === -Infinity ? 0 : measure.width,
		height: measure.height === -Infinity ? 0 : measure.height
	};
}
