import {isNumber, pack, offsetVector} from './helpers';

/**
 * A line/vector writer, which adds elements to current page
 * and sets their positions based on the context
 */
class ElementWriter {

	addQr(qr, index) {
		let context = this.context;
		let page = context.getCurrentPage();
		let position = this.getCurrentPositionOnPage();

		if (!page || (qr.absolutePosition === undefined && context.availableHeight < qr._height)) {
			return false;
		}

		if (qr._x === undefined) {
			qr._x = qr.x || 0;
		}

		qr.x = context.x + qr._x;
		qr.y = context.y;

		this.alignImage(qr);

		for (let i = 0, l = qr._canvas.length; i < l; i++) {
			let vector = qr._canvas[i];
			vector.x += qr.x;
			vector.y += qr.y;
			this.addVector(vector, true, true, index);
		}

		context.moveDown(qr._height);

		return position;
	}

	alignCanvas(node) {
		let width = this.context.availableWidth;
		let canvasWidth = node._minWidth;
		let offset = 0;
		switch (node._alignment) {
			case 'right':
				offset = width - canvasWidth;
				break;
			case 'center':
				offset = (width - canvasWidth) / 2;
				break;
		}
		if (offset) {
			node.canvas.forEach((vector) => {
				offsetVector(vector, offset, 0);
			});
		}
	}

}

export default ElementWriter;
