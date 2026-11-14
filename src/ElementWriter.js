import { isNumber } from './helpers/variableType';
import { pack, offsetVector } from './helpers/tools';
import DocumentContext from './DocumentContext';
import { EventEmitter } from 'events';

/**
 * A line/vector writer, which adds elements to current page and sets
 * their positions based on the context
 */
class ElementWriter extends EventEmitter {

	/**
	 * @param {DocumentContext} context
	 */
	constructor(context) {
		super();
		this._context = context;
		this.contextStack = [];
		this.verticalAlignmentStack = [];
	}

	/**
	 * @returns {DocumentContext}
	 */
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

		this.addPageItem(page, {
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
			// Whitespace trimmed from the line start is not a word gap (leadingCut includes -leadingIndent)
			let firstInline = line.inlines[0];
			let isFirstInlineTrimmed = line.leadingCut + (firstInline.leadingIndent || 0) > 0 && firstInline.text.trim() === '';
			let hasGapAfter = i => !line.inlines[i].noNewLine && !(i === 0 && isFirstInlineTrimmed);

			let gaps = 0;
			for (let i = 0, l = line.inlines.length - 1; i < l; i++) {
				if (hasGapAfter(i)) {
					gaps++;
				}
			}
			let additionalSpacing = gaps > 0 ? (width - lineWidth) / gaps : 0;

			for (let i = 1, l = line.inlines.length; i < l; i++) {
				let justifyShift = hasGapAfter(i - 1) ? additionalSpacing : 0;
				offset += justifyShift;

				line.inlines[i].x += offset;
				line.inlines[i].justifyShift = justifyShift;
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

		this.addPageItem(page, {
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

		this.addPageItem(page, {
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

		this.addPageItem(page, {
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

	addVector(vector, ignoreContextX, ignoreContextY, index, forcePage) {
		let context = this.context();
		let page = context.getCurrentPage();
		if (isNumber(forcePage)) {
			page = context.pages[forcePage];
		}
		let position = this.getCurrentPositionOnPage();

		if (page) {
			offsetVector(vector, ignoreContextX ? 0 : context.x, ignoreContextY ? 0 : context.y);
			this.addPageItem(page, {
				type: 'vector',
				item: vector
			}, index);
			return position;
		}
	}

	beginClip(width, height) {
		let ctx = this.context();
		let page = ctx.getCurrentPage();
		this.addPageItem(page, {
			type: 'beginClip',
			item: { x: ctx.x, y: ctx.y, width: width, height: height }
		});
		return true;
	}

	endClip() {
		let ctx = this.context();
		let page = ctx.getCurrentPage();
		this.addPageItem(page, {
			type: 'endClip'
		});
		return true;
	}

	beginVerticalAlignment(verticalAlignment) {
		let page = this.context().getCurrentPage();
		let item = {
			type: 'beginVerticalAlignment',
			item: { verticalAlignment: verticalAlignment }
		};
		this.addPageItem(page, item);
		this.verticalAlignmentStack.push({ item: item, page: page });
		return item;
	}

	endVerticalAlignment(verticalAlignment) {
		let page = this.context().getCurrentPage();
		let item = {
			type: 'endVerticalAlignment',
			item: { verticalAlignment: verticalAlignment }
		};
		this.addPageItem(page, item);
		this.verticalAlignmentStack.pop();
		return item;
	}

	/**
	 * Returns the begin item of the innermost vertical alignment block
	 * if it is still open and was started on the current page.
	 *
	 * @returns {object|null}
	 */
	getOpenVerticalAlignment() {
		let verticalAlignment = this.verticalAlignmentStack[this.verticalAlignmentStack.length - 1];
		if (verticalAlignment && verticalAlignment.page === this.context().getCurrentPage()) {
			return verticalAlignment.item;
		}
		return null;
	}

	/**
	 * Returns the index on the current page where cell backgrounds are inserted.
	 * Inside an open vertical alignment block, backgrounds are inserted right after
	 * its begin item, so they are moved together with the aligned content.
	 *
	 * @returns {number}
	 */
	getBackgroundInsertIndex() {
		let ctx = this.context();
		let verticalAlignment = this.getOpenVerticalAlignment();
		if (verticalAlignment) {
			return ctx.getCurrentPage().items.indexOf(verticalAlignment) + 1;
		}
		return ctx.backgroundLength[ctx.page];
	}

	addFragment(block, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition) {
		let ctx = this.context();
		let page = ctx.getCurrentPage();

		if (!useBlockXOffset && block.height > ctx.availableHeight) {
			return false;
		}

		// Positions are shared by leaf nodes and their containers. Update each
		// recorded position once, after the fragment has found its destination.
		(block.positions || []).forEach(position => {
			let left = position.left + (position._isAbsolutePosition ? 0 : useBlockXOffset ? (block.xOffset || 0) : ctx.x);
			let top = position.top + (position._isAbsolutePosition ? 0 : useBlockYOffset ? (block.yOffset || 0) : ctx.y);
			let pagePosition = ctx.getCurrentPosition();
			Object.assign(position, pagePosition, {
				left,
				top,
				horizontalRatio: (left - ctx.pageMargins.left) / pagePosition.pageInnerWidth,
				verticalRatio: (top - ctx.pageMargins.top) / pagePosition.pageInnerHeight
			});
			if (ctx.isAbsolutePosition) {
				position._isAbsolutePosition = true;
			}
			if (this.contextStack.length > 0) {
				page.positions = page.positions || [];
				page.positions.push(position);
			}
		});

		let unbreakableFillsInserted = 0;

		block.items.forEach(item => {
			const xOffset = item._isAbsolutePosition ? 0 : useBlockXOffset ? (block.xOffset || 0) : ctx.x;
			const yOffset = item._isAbsolutePosition ? 0 : useBlockYOffset ? (block.yOffset || 0) : ctx.y;
			switch (item.type) {
				case 'line':
					var l = item.item.clone();

					l.x = (l.x || 0) + xOffset;
					l.y = (l.y || 0) + yOffset;

					this.addPageItem(page, {
						type: 'line',
						item: l
					}, undefined, item._isAbsolutePosition || ctx.isAbsolutePosition);
					break;

				case 'vector':
					var v = pack(item.item);
					if (v.type === 'polyline') {
						v.points = v.points.map(point => pack(point));
					}

					offsetVector(v, xOffset, yOffset);
					if (v._isFillColorFromUnbreakable) {
						// If the item is a fillColor from an unbreakable block
						// We have to add it at the beginning of the items body array of the page
						// (or of the open vertical alignment block, see getBackgroundInsertIndex),
						// after the fills already inserted from this block so that they keep their draw order
						delete v._isFillColorFromUnbreakable;
						const endOfBackgroundItemsIndex = this.getBackgroundInsertIndex() + unbreakableFillsInserted;
						unbreakableFillsInserted++;
						this.addPageItem(page, {
							type: 'vector',
							item: v
						}, endOfBackgroundItemsIndex, item._isAbsolutePosition || ctx.isAbsolutePosition);
					} else {
						this.addPageItem(page, {
							type: 'vector',
							item: v
						}, undefined, item._isAbsolutePosition || ctx.isAbsolutePosition);
					}
					break;

				case 'image':
				case 'svg':
				case 'attachment':
				case 'beginClip':
				case 'endClip':
				case 'beginVerticalAlignment':
				case 'endVerticalAlignment':
					var img = pack(item.item);

					img.x = (img.x || 0) + xOffset;
					img.y = (img.y || 0) + yOffset;

					this.addPageItem(page, {
						type: item.type,
						item: img
					}, undefined, item._isAbsolutePosition || ctx.isAbsolutePosition);
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
	 * @param {DocumentContext|number} contextOrWidth
	 * @param {number} height
	 */
	pushContext(contextOrWidth, height) {
		let absolutePositionContext;
		if (contextOrWidth === undefined) {
			// Ordinary fragments retain the page dimensions for absolute content.
			// Explicitly sized contexts (headers, footers, backgrounds) keep their own.
			absolutePositionContext = this.context().absolutePositionContext || this.context();
			height = this.context().getCurrentPage().pageSize.height - this.context().pageMargins.top - this.context().pageMargins.bottom;
			contextOrWidth = this.context().availableWidth;
		}

		if (isNumber(contextOrWidth)) {
			let width = contextOrWidth;
			contextOrWidth = new DocumentContext();
			contextOrWidth.addPage({ width: width, height: height }, { left: 0, right: 0, top: 0, bottom: 0 });
			contextOrWidth.absolutePositionContext = absolutePositionContext;
		}

		this.contextStack.push(this.context());
		this._context = contextOrWidth;
	}

	popContext() {
		this._context = this.contextStack.pop();
	}

	getCurrentPositionOnPage() {
		let context = this.context();
		let position = context.getCurrentPosition();
		if (context.isAbsolutePosition) {
			position._isAbsolutePosition = true;
		}
		if (this.contextStack.length > 0) {
			let page = context.getCurrentPage();
			page.positions = page.positions || [];
			page.positions.push(position);
		}
		return position;
	}

	addPageItem(page, item, index, isAbsolutePosition = this.context().isAbsolutePosition) {
		// keep the flag on this occurrence, not on a reusable input node or vector
		if (isAbsolutePosition) {
			item._isAbsolutePosition = true;
		}
		if (index === null || index === undefined || index < 0 || index > page.items.length) {
			page.items.push(item);
		} else {
			page.items.splice(index, 0, item);
		}
	}
}

export default ElementWriter;
