import { isNumber, isValue } from './helpers/variableType';
import { offsetVector, pack } from './helpers/tools';
import { EventEmitter } from 'events';
import DocumentContext from './DocumentContext';
import Line from './Line';

const addPageItem = function (page, item, index) {
	if (!isValue(index) || index < 0 || index > page.items.length) {
		page.items.push(item);
	} else {
		page.items.splice(index, 0, item);
	}
};

/**
 * a line/vector writer, which adds elements to current page and sets their positions based on the context
 */
class ElementWriter extends EventEmitter {

	/**
	 * @param {DocumentContext} context
	 */
	constructor(context) {
		super();
		this.context = context;
		this.contextStack = [];
	}


	/**
	 * Pushes the provided context onto the stack or creates a new one
	 *
	 * pushContext(context) - pushes the provided context and makes it current
	 * pushContext(width, height) - creates and pushes a new context with the specified width and height
	 * pushContext() - creates a new context for unbreakable blocks (with current availableWidth and full-page-height)
	 */
	pushContext(contextOrWidth, height) {
		if (contextOrWidth === undefined) {
			height = this.context.getCurrentPage().height - this.context.pageMargins.top - this.context.pageMargins.bottom;
			contextOrWidth = this.context.availableWidth;
		}

		if (isNumber(contextOrWidth)) {
			contextOrWidth = new DocumentContext({ width: contextOrWidth, height: height }, { left: 0, right: 0, top: 0, bottom: 0 });
		}

		this.contextStack.push(this.context);
		this.context = contextOrWidth;
	}

	popContext() {
		this.context = this.contextStack.pop();
	}

	/**
	 * @return {object}
	 */
	getCurrentPositionOnPage() {
		return (this.contextStack[0] || this.context).getCurrentPosition();
	}

	addFragment(block, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition) {
		const cloneLine = function (line) {
			let result = new Line(line.maxWidth);

			for (let key in line) {
				if (line.hasOwnProperty(key)) {
					result[key] = line[key];
				}
			}

			return result;
		};

		let ctx = this.context;
		let page = ctx.getCurrentPage();

		if (!useBlockXOffset && block.height > ctx.availableHeight) {
			return false;
		}

		block.items.forEach(function (item) {
			switch (item.type) {
				case 'line':
					var l = cloneLine(item.item);

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
					var img = pack(item.item);

					img.x = (img.x || 0) + (useBlockXOffset ? (block.xOffset || 0) : ctx.x);
					img.y = (img.y || 0) + (useBlockYOffset ? (block.yOffset || 0) : ctx.y);

					page.items.push({
						type: 'image',
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

	addLine(line, dontUpdateContextPosition, index) {
		let height = line.getHeight();
		let context = this.context;
		let page = context.getCurrentPage();
		let position = this.getCurrentPositionOnPage();

		if (context.availableHeight < height || !page) {
			return false;
		}

		line.x = context.x + (line.x || 0);
		line.y = context.y + (line.y || 0);

		this._alignLine(line);

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

	addCanvas(canvas, index) {
		let height = canvas._minHeight;
		let context = this.context;
		let page = context.getCurrentPage();
		let position = this.getCurrentPositionOnPage();

		// TODO: support for canvas larger than a page
		// TODO: support for other overflow methods
		if (!page || (canvas.absolutePosition === undefined && context.availableHeight < height)) {
			return false;
		}

		this._alignCanvas(canvas);

		canvas.canvas.forEach(function (vector) {
			let position = this.addVector(vector);
			canvas.positions.push(position);
		}, this);

		context.moveDown(height);

		return canvas.positions; // TODO: Or position? Or variable positions and add to canvas after this method?
	}

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

		this._alignImage(image);

		addPageItem(page, {
			type: 'image',
			item: image
		}, index);

		context.moveDown(image._height);

		return position;
	}

	/**
	 * @param {Line} line
	 */
	_alignLine(line) {
		let width = this.context.availableWidth;
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

	_alignImage(image) {
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

	_alignCanvas(canvas) {
		let width = this.context.availableWidth;
		let canvasWidth = canvas._minWidth;
		let offset = 0;
		switch (canvas._alignment) {
			case 'right':
				offset = width - canvasWidth;
				break;
			case 'center':
				offset = (width - canvasWidth) / 2;
				break;
		}
		if (offset) {
			canvas.canvas.forEach(function (vector) {
				offsetVector(vector, offset, 0);
			});
		}
	}

}

export default ElementWriter;
