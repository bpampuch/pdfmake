/**
 * @mixin
 */
const CanvasMeasurer = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'canvas' in node,
			node => this.measureCanvas(node)
		);
	}

	measureCanvas(node) {
		let w = 0;
		let h = 0;

		for (let i = 0, l = node.canvas.length; i < l; i++) {
			let vector = node.canvas[i];

			switch (vector.type) {
				case 'ellipse':
					w = Math.max(w, vector.x + vector.r1);
					h = Math.max(h, vector.y + vector.r2);
					break;
				case 'rect':
					w = Math.max(w, vector.x + vector.w);
					h = Math.max(h, vector.y + vector.h);
					break;
				case 'line':
					w = Math.max(w, vector.x1, vector.x2);
					h = Math.max(h, vector.y1, vector.y2);
					break;
				case 'polyline':
					for (var i2 = 0, l2 = vector.points.length; i2 < l2; i2++) {
						w = Math.max(w, vector.points[i2].x);
						h = Math.max(h, vector.points[i2].y);
					}
					break;
			}
		}

		node._minWidth = node._maxWidth = w;
		node._minHeight = node._maxHeight = h;
		node._alignment = this.styleStack.getProperty('alignment');

		return node;
	}

};

export default CanvasMeasurer;
