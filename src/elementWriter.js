'use strict';

var Line = require('./line');
var isNumber = require('./helpers').isNumber;
var pack = require('./helpers').pack;
var offsetVector = require('./helpers').offsetVector;
var DocumentContext = require('./documentContext');

/**
 * Creates an instance of ElementWriter - a line/vector writer, which adds
 * elements to current page and sets their positions based on the context
 */
function ElementWriter(context, tracker) {
	this.context = context;
	this.contextStack = [];
	this.tracker = tracker;
}

function addPageItem(page, item, index) {
	if (index === null || index === undefined || index < 0 || index > page.items.length) {
		page.items.push(item);
	} else {
		page.items.splice(index, 0, item);
	}
}

ElementWriter.prototype.addLine = function (line, dontUpdateContextPosition, index) {
	var height = line.getHeight();
	var context = this.context;
	var page = context.getCurrentPage(),
		position = this.getCurrentPositionOnPage();

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
	this.tracker.emit('lineAdded', line);

	if (!dontUpdateContextPosition) {
		context.moveDown(height);
	}

	return position;
};

ElementWriter.prototype.alignLine = function (line) {
	var width = this.context.availableWidth;
	var lineWidth = line.getWidth();

	var alignment = line.inlines && line.inlines.length > 0 && line.inlines[0].alignment;

	var offset = 0;
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
		var additionalSpacing = (width - lineWidth) / (line.inlines.length - 1);

		for (var i = 1, l = line.inlines.length; i < l; i++) {
			offset = i * additionalSpacing;

			line.inlines[i].x += offset;
			line.inlines[i].justifyShift = additionalSpacing;
		}
	}
};

ElementWriter.prototype.addImage = function (image, index, type) {
	var context = this.context;
	var page = context.getCurrentPage(),
		position = this.getCurrentPositionOnPage();

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
		type: type || 'image',
		item: image
	}, index);

	context.moveDown(image._height);

	return position;
};

ElementWriter.prototype.addSVG = function (image, index) {
	return this.addImage(image, index, 'svg');
};

ElementWriter.prototype.addQr = function (qr, index) {
	var context = this.context;
	var page = context.getCurrentPage(),
		position = this.getCurrentPositionOnPage();

	if (!page || (qr.absolutePosition === undefined && context.availableHeight < qr._height)) {
		return false;
	}

	if (qr._x === undefined) {
		qr._x = qr.x || 0;
	}

	qr.x = context.x + qr._x;
	qr.y = context.y;

	this.alignImage(qr);

	for (var i = 0, l = qr._canvas.length; i < l; i++) {
		var vector = qr._canvas[i];
		vector.x += qr.x;
		vector.y += qr.y;
		this.addVector(vector, true, true, index);
	}

	context.moveDown(qr._height);

	return position;
};

ElementWriter.prototype.alignImage = function (image) {
	var width = this.context.availableWidth;
	var imageWidth = image._minWidth;
	var offset = 0;
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
};

ElementWriter.prototype.alignCanvas = function (node) {
	var width = this.context.availableWidth;
	var canvasWidth = node._minWidth;
	var offset = 0;
	switch (node._alignment) {
		case 'right':
			offset = width - canvasWidth;
			break;
		case 'center':
			offset = (width - canvasWidth) / 2;
			break;
	}
	if (offset) {
		node.canvas.forEach(function (vector) {
			offsetVector(vector, offset, 0);
		});
	}
};

ElementWriter.prototype.addVector = function (vector, ignoreContextX, ignoreContextY, index, forcePage) {
	var context = this.context;
	var page = context.getCurrentPage();
	if (isNumber(forcePage)) {
		page = context.pages[forcePage];
	}
	var position = this.getCurrentPositionOnPage();

	if (page) {
		offsetVector(vector, ignoreContextX ? 0 : context.x, ignoreContextY ? 0 : context.y);
		addPageItem(page, {
			type: 'vector',
			item: vector
		}, index);
		return position;
	}
};

ElementWriter.prototype.beginClip = function (width, height) {
	var ctx = this.context;
	var page = ctx.getCurrentPage();
	page.items.push({
		type: 'beginClip',
		item: { x: ctx.x, y: ctx.y, width: width, height: height }
	});
	return true;
};

ElementWriter.prototype.endClip = function () {
	var ctx = this.context;
	var page = ctx.getCurrentPage();
	page.items.push({
		type: 'endClip'
	});
	return true;
};

function cloneLine(line) {
	var result = new Line(line.maxWidth);

	for (var key in line) {
		if (line.hasOwnProperty(key)) {
			result[key] = line[key];
		}
	}

	return result;
}

ElementWriter.prototype.addFragment = function (block, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition, isFooter) {
	var ctx = this.context;
	var page = ctx.getCurrentPage();

	if (!useBlockXOffset && block.height > ctx.availableHeight) {
		return false;
	}

	if (isFooter && block._footerGapOption && block._footerGapOption.enabled) {
        var gapHeight = ctx.availableHeight - block.height;
        if (gapHeight > 0) {
            var gapTopY = ctx.y;
            var colSpec = block._footerGapOption.columns || null;
            if (colSpec) {
                var rawWidths = colSpec.content.vLines || [];

				if (rawWidths && rawWidths.length > 1) {
					var span = rawWidths[rawWidths.length - 1];
					if (span <= 0) span = 1;
					var scale = ctx.availableWidth / span;
					var style = (colSpec.style || {});
					var lw = style.lineWidth != null ? style.lineWidth : 0.5;
					var lc = style.color || '#000000';
					var dashCfg = style.dash;
					var includeOuter = colSpec.includeOuter !== false;
					var startIndex = includeOuter ? 0 : 1;
					var endIndex = includeOuter ? rawWidths.length : rawWidths.length - 1;

					for (var ci = startIndex; ci < endIndex; ci++) {
						var xGuide = ctx.x + rawWidths[ci] - 0.25;
						page.items.push({
							type: 'vector',
							item: {
								type: 'line',
								x1: xGuide,
								y1: gapTopY,
								x2: xGuide,
								y2: gapTopY + gapHeight,
								lineWidth: lw,
								lineColor: lc,
								dash: dashCfg ? {
									length: dashCfg.length,
									space: dashCfg.space != null ? dashCfg.space : dashCfg.gap
								} : undefined,
								_footerGuideLine: true
							}
						});
					}
                }
			}
            ctx.moveDown(gapHeight);
        }
  	} else if(isFooter){
		ctx.moveDown(ctx.availableHeight - block.height);
	} 

	block.items.forEach(function (item) {
		switch (item.type) {
			case 'line':
				var l = cloneLine(item.item);

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
				if (v._isFillColorFromUnbreakable) {
					// If the item is a fillColor from an unbreakable block
					// We have to add it at the beginning of the items body array of the page
					delete v._isFillColorFromUnbreakable;
					const endOfBackgroundItemsIndex = ctx.backgroundLength[ctx.page];
					page.items.splice(endOfBackgroundItemsIndex, 0, {
						type: 'vector',
						item: v
					});
				} else {
					page.items.push({
						type: 'vector',
						item: v
					});
				}
				break;

			case 'image':
			case 'svg':
			case 'beginVerticalAlign':
			case 'endVerticalAlign':
			case 'beginClip':
			case 'endClip':
				var it = pack(item.item);
				it.x = (it.x || 0) + (useBlockXOffset ? (block.xOffset || 0) : ctx.x);
				it.y = (it.y || 0) + (useBlockYOffset ? (block.yOffset || 0) : ctx.y);

				page.items.push({
					type: item.type,
					item: it
				});
				break;
		}
	});

	if (!dontUpdateContextPosition) {
		ctx.moveDown(block.height);
	}

	return true;
};

/**
 * Pushes the provided context onto the stack or creates a new one
 *
 * pushContext(context) - pushes the provided context and makes it current
 * pushContext(width, height) - creates and pushes a new context with the specified width and height
 * pushContext() - creates a new context for unbreakable blocks (with current availableWidth and full-page-height)
 */
ElementWriter.prototype.pushContext = function (contextOrWidth, height) {
	if (contextOrWidth === undefined) {
		height = this.context.getCurrentPage().height - this.context.pageMargins.top - this.context.pageMargins.bottom;
		contextOrWidth = this.context.availableWidth;
	}

	if (isNumber(contextOrWidth)) {
		if (this.context._footerGapOption) {
			contextOrWidth = new DocumentContext({width: contextOrWidth, height: height}, {left: 0, right: 0, top: 0, bottom: 0}, this.context._footerGapOption);
		} else {
			contextOrWidth = new DocumentContext({ width: contextOrWidth, height: height }, { left: 0, right: 0, top: 0, bottom: 0 });
		}
	}

	this.contextStack.push(this.context);
	this.context = contextOrWidth;
};

ElementWriter.prototype.popContext = function () {
	this.context = this.contextStack.pop();
};

ElementWriter.prototype.getCurrentPositionOnPage = function () {
	return (this.contextStack[0] || this.context).getCurrentPosition();
};

ElementWriter.prototype.beginClip = function (width, height) {
	var ctx = this.context;
	var page = ctx.getCurrentPage();
	var item = {
		type: 'beginClip',
		item: { x: ctx.x, y: ctx.y, width: width, height: height }
	};
	page.items.push(item);
	return item;
};

ElementWriter.prototype.endClip = function () {
	var ctx = this.context;
	var page = ctx.getCurrentPage();
	var item = {
		type: 'endClip'
	};
	page.items.push(item);
	return item;
};

ElementWriter.prototype.beginVerticalAlign = function (verticalAlign) {
	var ctx = this.context;
	var page = ctx.getCurrentPage();
	var item = {
		type: 'beginVerticalAlign',
		item: { verticalAlign: verticalAlign }
	};
	page.items.push(item);
	return item;
};

ElementWriter.prototype.endVerticalAlign = function (verticalAlign) {
	var ctx = this.context;
	var page = ctx.getCurrentPage();
	var item = {
		type: 'endVerticalAlign',
		item: { verticalAlign: verticalAlign }
	};
	page.items.push(item);
	return item;
};


module.exports = ElementWriter;
