import { isNumber } from './helpers/variableType';
import { pack, offsetVector } from './helpers/tools';
import DocumentContext from './DocumentContext';
import { EventEmitter } from 'events';

/**
 * A line/vector writer, which adds elements to current page and sets
 * their positions based on the context
 */
class ElementWriter extends EventEmitter {
	constructor(context) {
		super();
		this._context = context;
		this.contextStack = [];
	}

	context() {
		return this._context;
	}

	addLine(line, dontUpdateContextPosition, index) {
		let height = line.getHeight();
		let context = this.context();
		let page = context.getCurrentPage();
		let position = this.getCurrentPositionOnPage();

		if (context.availableHeight < height || !page) {
			return false;
		}

		line.x = context.x + (line.x || 0);
		line.y = context.y + (line.y || 0);

		this.alignLine(line);

		addPageItem(page, {
			type: 'line',
			item: line
		}, index);
		this.emit('lineAdded', line);

		if (!dontUpdateContextPosition) {
			context.moveDown(height);
		}

		return position;
	}

	alignLine(line) {
		let width = this.context().availableWidth;
		let lineWidth = line.getWidth();

		let alignment = line.inlines && line.inlines.length > 0 && line.inlines[0].alignment;

		let offset = 0;
		switch (alignment) {
			case 'right':
				offset = width - lineWidth;
				break;
			case 'center':
				offset = (width - lineWidth) / 2;
				break;
		}

		if (offset) {
			line.x = (line.x || 0) + offset;
		}

		if (alignment === 'justify' &&
			!line.newLineForced &&
			!line.lastLineInParagraph &&
			line.inlines.length > 1) {
			let additionalSpacing = (width - lineWidth) / (line.inlines.length - 1);

			for (let i = 1, l = line.inlines.length; i < l; i++) {
				offset = i * additionalSpacing;

				line.inlines[i].x += offset;
				line.inlines[i].justifyShift = additionalSpacing;
			}
		}
	}

	addImage(image, index) {
		let context = this.context();
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

	addCanvas(node, index) {
		let context = this.context();
		let page = context.getCurrentPage();
		let positions = [];
		let height = node._minHeight;

		if (!page || (node.absolutePosition === undefined && context.availableHeight < height)) {
			// TODO: support for canvas larger than a page
			// TODO: support for other overflow methods

			return false;
		}

		this.alignCanvas(node);

		node.canvas.forEach(function (vector) {
			let position = this.addVector(vector, false, false, index);
			positions.push(position);
			if (index !== undefined) {
				index++;
			}
		}, this);

		context.moveDown(height);

		return positions;
	}

	addSVG(image, index) {
		// TODO: same as addImage
		let context = this.context();
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
			type: 'svg',
			item: image
		}, index);

		context.moveDown(image._height);

		return position;
	}

	addQr(qr, index) {
		let context = this.context();
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

	addAttachment(attachment, index) {
		let context = this.context();
		let page = context.getCurrentPage();
		let position = this.getCurrentPositionOnPage();

		if (!page || (attachment.absolutePosition === undefined && context.availableHeight < attachment._height && page.items.length > 0)) {
			return false;
		}

		if (attachment._x === undefined) {
			attachment._x = attachment.x || 0;
		}

		attachment.x = context.x + attachment._x;
		attachment.y = context.y;

		addPageItem(page, {
			type: 'attachment',
			item: attachment
		}, index);

		context.moveDown(attachment._height);

		return position;
	}

	alignImage(image) {
		let width = this.context().availableWidth;
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
		let width = this.context().availableWidth;
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
			node.canvas.forEach(vector => {
				offsetVector(vector, offset, 0);
			});
		}
	}

	addVector(vector, ignoreContextX, ignoreContextY, index) {
		let context = this.context();
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
		let ctx = this.context();
		let page = ctx.getCurrentPage();
		page.items.push({
			type: 'beginClip',
			item: { x: ctx.x, y: ctx.y, width: width, height: height }
		});
		return true;
	}

	endClip() {
		let ctx = this.context();
		let page = ctx.getCurrentPage();
		page.items.push({
			type: 'endClip'
		});
		return true;
	}

	addFragment(block, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition) {
		let ctx = this.context();
		let page = ctx.getCurrentPage();

		if (!useBlockXOffset && block.height > ctx.availableHeight) {
			return false;
		}

		block.items.forEach(item => {
			switch (item.type) {
				case 'line':
					var l = item.item.clone();

					if (l._node) {
						l._node.positions[0].pageNumber = ctx.page + 1;
					}
					l.x = (l.x || 0) + (useBlockXOffset ? (block.xOffset || 0) : ctx.x);
					l.y = (l.y || 0) + (useBlockYOffset ? (block.yOffset || 0) : ctx.y);

					page.items.push({
						type: 'line',
						item: l
					});
					break;

				case 'vector':
					var v = pack(item.item);

					offsetVector(v, useBlockXOffset ? (block.xOffset || 0) : ctx.x, useBlockYOffset ? (block.yOffset || 0) : ctx.y);
					page.items.push({
						type: 'vector',
						item: v
					});
					break;

				case 'image':
				case 'svg':
					var img = pack(item.item);

					img.x = (img.x || 0) + (useBlockXOffset ? (block.xOffset || 0) : ctx.x);
					img.y = (img.y || 0) + (useBlockYOffset ? (block.yOffset || 0) : ctx.y);

					page.items.push({
						type: item.type,
						item: img
					});
					break;
			}
		});

		if (!dontUpdateContextPosition) {
			ctx.moveDown(block.height);
		}

		return true;
	}

	/**
	 * Pushes the provided context onto the stack or creates a new one
	 *
	 * pushContext(context) - pushes the provided context and makes it current
	 * pushContext(width, height) - creates and pushes a new context with the specified width and height
	 * pushContext() - creates a new context for unbreakable blocks (with current availableWidth and full-page-height)
	 *
	 * @param {object|number} contextOrWidth
	 * @param {number} height
	 */
	pushContext(contextOrWidth, height) {
		if (contextOrWidth === undefined) {
			height = this.context().getCurrentPage().height - this.context().pageMargins.top - this.context().pageMargins.bottom;
			contextOrWidth = this.context().availableWidth;
		}

		if (isNumber(contextOrWidth)) {
			contextOrWidth = new DocumentContext({ width: contextOrWidth, height: height }, { left: 0, right: 0, top: 0, bottom: 0 });
		}

		this.contextStack.push(this.context());
		this._context = contextOrWidth;
	}

	popContext() {
		this._context = this.contextStack.pop();
	}

	getCurrentPositionOnPage() {
		return (this.contextStack[0] || this.context()).getCurrentPosition();
	}
}

function addPageItem(page, item, index) {
	if (index === null || index === undefined || index < 0 || index > page.items.length) {
		page.items.push(item);
	} else {
		page.items.splice(index, 0, item);
	}
}

export default ElementWriter;
