import {isNumber, pack, offsetVector} from './helpers';

/**
 * A line/vector writer, which adds elements to current page
 * and sets their positions based on the context
 */
class ElementWriter {


	addImage(image, index) {
		let context = this.context;
		let page = context.getCurrentPage();
		let position = this.getCurrentPositionOnPage();

		if (!page || (image.absolutePosition === undefined && context.availableHeight < image._height && page.items.length > 0)) {
			return false;
		}

		if (image._x === undefined) {
			image._x = image.x || 0;
		}

		image.x = context.x + image._x;
		image.y = context.y;

		this.alignImage(image);

		addPageItem(page, {
			type: 'image',
			item: image
		}, index);

		context.moveDown(image._height);

		return position;
	}

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

	alignImage(image) {
		let width = this.context.availableWidth;
		let imageWidth = image._minWidth;
		let offset = 0;
		switch (image._alignment) {
			case 'right':
				offset = width - imageWidth;
				break;
			case 'center':
				offset = (width - imageWidth) / 2;
				break;
		}

		if (offset) {
			image.x = (image.x || 0) + offset;
		}
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

	addVector(vector, ignoreContextX, ignoreContextY, index) {
		let context = this.context;
		let page = context.getCurrentPage();
		let position = this.getCurrentPositionOnPage();

		if (page) {
			offsetVector(vector, ignoreContextX ? 0 : context.x, ignoreContextY ? 0 : context.y);
			addPageItem(page, {
				type: 'vector',
				item: vector
			}, index);
			return position;
		}
	}

	beginClip(width, height) {
		let ctx = this.context;
		let page = ctx.getCurrentPage();
		page.items.push({
			type: 'beginClip',
			item: {x: ctx.x, y: ctx.y, width: width, height: height}
		});
		return true;
	}

	endClip() {
		let ctx = this.context;
		let page = ctx.getCurrentPage();
		page.items.push({
			type: 'endClip'
		});
		return true;
	}

	addFragment(block, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition) {


		block.items.forEach((item) => {
			switch (item.type) {
			/*case 'line':
					let l = cloneLine(item.item);

					l.x = (l.x || 0) + (useBlockXOffset ? (block.xOffset || 0) : ctx.x);
					l.y = (l.y || 0) + (useBlockYOffset ? (block.yOffset || 0) : ctx.y);

					page.items.push({
						type: 'line',
						item: l
					});
					break;
*/

				case 'vector':
					let v = pack(item.item);

					offsetVector(v, useBlockXOffset ? (block.xOffset || 0) : ctx.x, useBlockYOffset ? (block.yOffset || 0) : ctx.y);
					page.items.push({
						type: 'vector',
						item: v
					});
					break;

				case 'image':
					let img = pack(item.item);

					img.x = (img.x || 0) + (useBlockXOffset ? (block.xOffset || 0) : ctx.x);
					img.y = (img.y || 0) + (useBlockYOffset ? (block.yOffset || 0) : ctx.y);

					page.items.push({
						type: 'image',
						item: img
					});
					break;
			}
		});

	}
}

export default ElementWriter;
