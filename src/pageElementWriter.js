'use strict';

var isUndefined = require('./helpers').isUndefined;
var ElementWriter = require('./elementWriter');

var newPageFooterBreak = true;

/**
 * Creates an instance of PageElementWriter - an extended ElementWriter
 * which can handle:
 * - page-breaks (it adds new pages when there's not enough space left),
 * - repeatable fragments (like table-headers, which are repeated everytime
 *                         a page-break occurs)
 * - transactions (used for unbreakable-blocks when we want to make sure
 *                 whole block will be rendered on the same page)
 */
function PageElementWriter(context, tracker) {
	this.transactionLevel = 0;
	this.repeatables = [];
	this.tracker = tracker;
	this.writer = new ElementWriter(context, tracker);
}

function fitOnPage(self, addFct) {
	var position = addFct(self);
	if (!position) {
		self.moveToNextPage();
		position = addFct(self);
	}
	return position;
}

PageElementWriter.prototype.addLine = function (line, dontUpdateContextPosition, index) {
	return fitOnPage(this, function (self) {
		return self.writer.addLine(line, dontUpdateContextPosition, index);
	});
};

PageElementWriter.prototype.addImage = function (image, index) {
	return fitOnPage(this, function (self) {
		return self.writer.addImage(image, index);
	});
};

PageElementWriter.prototype.addSVG = function (image, index) {
	return fitOnPage(this, function (self) {
		return self.writer.addSVG(image, index);
	});
};

PageElementWriter.prototype.addQr = function (qr, index) {
	return fitOnPage(this, function (self) {
		return self.writer.addQr(qr, index);
	});
};

PageElementWriter.prototype.addVector = function (vector, ignoreContextX, ignoreContextY, index, forcePage) {
	return this.writer.addVector(vector, ignoreContextX, ignoreContextY, index, forcePage);
};

PageElementWriter.prototype.beginClip = function (width, height) {
	return this.writer.beginClip(width, height);
};

PageElementWriter.prototype.endClip = function () {
	return this.writer.endClip();
};

PageElementWriter.prototype.alignCanvas = function (node) {
	this.writer.alignCanvas(node);
};

PageElementWriter.prototype.addFragment = function (fragment, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition, isFooter) {
	if (isFooter) {
		var ctxOpt = this.writer.context._footerGapOption;
		if (ctxOpt && ctxOpt.enabled && fragment.footerGap !== false && !fragment._footerGapOption) {
			fragment._footerGapOption = ctxOpt;
		}
		
		if (this.writer.context._footerColumnGuides && !fragment.disableFooterColumnGuides && !fragment._footerGuideSpec) {
			var g = this.writer.context._footerColumnGuides;
			fragment._footerGuideSpec = {
					widths: g.widths ? g.widths.slice() : undefined,
					stops: g.stops ? g.stops.slice() : undefined,
					style: g.style ? Object.assign({}, g.style) : {},
					includeOuter: g.includeOuter
			};
		}
	}

	var result = this.writer.addFragment(fragment, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition, isFooter);
	if (isFooter) {
		if (result && isFooter == 1) {
			newPageFooterBreak = false;
			return true;
		} else if (!result && isFooter == 2 && newPageFooterBreak) {
			this.moveToNextPage();
			this.writer.addFragment(fragment, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition, isFooter);
		} else if (!result && isFooter == 1) {
			// Draw footer vertical lines before moving to next page
			this.drawFooterVerticalLines(fragment);
			this.moveToNextPage();
		}
	} else {
		if (!result) {
			this.moveToNextPage();
			this.writer.addFragment(fragment, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition, isFooter);
		}
	}
	return result;
};

PageElementWriter.prototype.drawFooterVerticalLines = function (fragment) {
	var ctx = this.writer.context;
	var footerOpt = fragment._footerGapOption || (ctx && ctx._footerGapOption);
	
	if (!footerOpt || !footerOpt.enabled || !footerOpt.columns || !footerOpt.columns.content) {
		return;
	}
	
	var vLines = footerOpt.columns.content.vLines;
	var vLineWidths = footerOpt.columns.content.vLineWidths;
	if (!vLines || vLines.length === 0) {
		return;
	}
	
	// Get the current page bottom position (accounting for margins)
	var pageHeight = ctx.getCurrentPage().pageSize.height;
	var bottomMargin = ctx.pageMargins.bottom;
	var bottomY = pageHeight - bottomMargin;
	
	// Calculate where the footer content would start if it were on this page
	// Use current Y position as the top of the vertical lines
	var topY = ctx.y;
	
	// Store current page for drawing
	var currentPage = ctx.page;
	
	// Get line style from footerGapOption (for color and dash, but NOT width)
	var lineStyle = footerOpt.columns && footerOpt.columns.style ? footerOpt.columns.style : {};
	var lineColor = lineStyle.color || footerOpt.lineColor || 'black';
	var dash = lineStyle.dash || footerOpt.dash;
	
	// Calculate positions based on column widths to ensure perfect alignment
	var widths = footerOpt.columns.widths || [];
	if (widths.length === 0) {
		// Fallback to collected positions if widths not available
		for (var i = 0; i < vLines.length; i++) {
			var xPos = vLines[i];
			var lineWidth = (vLineWidths && vLineWidths[i]) || 1;
			var centeredX = xPos + (lineWidth / 2);
			this.writer.addVector({
				type: 'line',
				x1: centeredX,
				y1: topY,
				x2: centeredX,
				y2: bottomY,
				lineWidth: lineWidth,
				lineColor: lineColor,
				dash: dash
			}, true, true, undefined, currentPage);
		}
	} else {
		// Calculate positions from column widths for perfect alignment
		var startX = ctx.x;
		var currentX = startX;
		
		// Draw leftmost border if includeOuter is true
		if (footerOpt.columns.includeOuter && vLineWidths && vLineWidths[0]) {
			var leftLineWidth = vLineWidths[0] || 1;
			this.writer.addVector({
				type: 'line',
				x1: currentX + (leftLineWidth / 2),
				y1: topY,
				x2: currentX + (leftLineWidth / 2),
				y2: bottomY,
				lineWidth: leftLineWidth,
				lineColor: lineColor,
				dash: dash
			}, true, true, undefined, currentPage);
		}
		
		// Draw lines between columns
		var vLineIndex = footerOpt.columns.includeOuter ? 1 : 0;
		for (var col = 0; col < widths.length; col++) {
			var colWidth = widths[col];
			// Convert percentage or star widths to pixels if needed
			if (typeof colWidth === 'string') {
				// For now, skip string widths - they should have been calculated already
				continue;
			}
			currentX += colWidth;
			
			if (vLineIndex < vLineWidths.length) {
				var currentLineWidth = vLineWidths[vLineIndex] || 1;
				this.writer.addVector({
					type: 'line',
					x1: currentX + (currentLineWidth / 2),
					y1: topY,
					x2: currentX + (currentLineWidth / 2),
					y2: bottomY,
					lineWidth: currentLineWidth,
					lineColor: lineColor,
					dash: dash
				}, true, true, undefined, currentPage);
				vLineIndex++;
			}
		}
	}
	
	// Don't clear the vLines array - they will be reused on the next page
	// footerOpt.columns.content.vLines = [];
};

PageElementWriter.prototype.addFragment_test = function (fragment) {
	if (fragment.height > this.writer.context.availableHeight) {
		return false;
	}
	return true;
};

PageElementWriter.prototype.removeBeginClip = function (item) {
	return this.writer.removeBeginClip(item);
};

PageElementWriter.prototype.beginVerticalAlign = function (verticalAlign) {
	return this.writer.beginVerticalAlign(verticalAlign);
};

PageElementWriter.prototype.endVerticalAlign = function (verticalAlign) {
	return this.writer.endVerticalAlign(verticalAlign);
};

PageElementWriter.prototype.moveToNextPage = function (pageOrientation) {

	var nextPage = this.writer.context.moveToNextPage(pageOrientation);

	// moveToNextPage is called multiple times for table, because is called for each column
	// and repeatables are inserted only in the first time. If columns are used, is needed
	// call for table in first column and then for table in the second column (is other repeatables).
	if (nextPage.newPageCreated) {
		this.repeatables.forEach(function (rep) {
			this.writer.addFragment(rep, true);
		}, this);
	} else {
		this.repeatables.forEach(function (rep) {
			this.writer.context.moveDown(rep.height);
		}, this);
	}

	this.writer.tracker.emit('pageChanged', {
		prevPage: nextPage.prevPage,
		prevY: nextPage.prevY,
		y: this.writer.context.y
	});
};

PageElementWriter.prototype.beginUnbreakableBlock = function (width, height) {
	if (this.transactionLevel++ === 0) {
		this.originalX = this.writer.context.x;
		this.writer.pushContext(width, height);
	}
};

PageElementWriter.prototype.commitUnbreakableBlock = function (forcedX, forcedY, isFooter) {
	if (--this.transactionLevel === 0) {
		var unbreakableContext = this.writer.context;
		this.writer.popContext();

		var nbPages = unbreakableContext.pages.length;
		if (nbPages > 0) {
			// no support for multi-page unbreakableBlocks
			var fragment = unbreakableContext.pages[0];
			fragment.xOffset = forcedX;
			fragment.yOffset = forcedY;

			//TODO: vectors can influence height in some situations
			if (nbPages > 1) {
				// on out-of-context blocs (headers, footers, background) height should be the whole DocumentContext height
				if (forcedX !== undefined || forcedY !== undefined) {
					fragment.height = unbreakableContext.getCurrentPage().pageSize.height - unbreakableContext.pageMargins.top - unbreakableContext.pageMargins.bottom;
				} else {
					fragment.height = this.writer.context.getCurrentPage().pageSize.height - this.writer.context.pageMargins.top - this.writer.context.pageMargins.bottom;
					for (var i = 0, l = this.repeatables.length; i < l; i++) {
						fragment.height -= this.repeatables[i].height;
					}
				}
			} else {
				fragment.height = unbreakableContext.y;
			}

			if (forcedX !== undefined || forcedY !== undefined) {
				this.writer.addFragment(fragment, true, true, true);
			} else {
				return this.addFragment(fragment, undefined, undefined, undefined, isFooter);
			}
		}
	}
};

PageElementWriter.prototype.commitUnbreakableBlock_test = function (forcedX, forcedY) {
	if (--this.transactionLevel === 0) {
		var unbreakableContext = this.writer.context;
		this.writer.popContext();

		var nbPages = unbreakableContext.pages.length;
		if (nbPages > 0) {
			var fragment = unbreakableContext.pages[0];
			fragment.xOffset = forcedX;
			fragment.yOffset = forcedY;
			fragment.height = unbreakableContext.y;
			return this.addFragment_test(fragment);
		}
	}
};

PageElementWriter.prototype.currentBlockToRepeatable = function () {
	var unbreakableContext = this.writer.context;
	var rep = { items: [] };

	unbreakableContext.pages[0].items.forEach(function (item) {
		rep.items.push(item);
	});

	rep.xOffset = this.originalX;

	//TODO: vectors can influence height in some situations
	rep.height = unbreakableContext.y;

	rep.insertedOnPages = [];

	return rep;
};

PageElementWriter.prototype.pushToRepeatables = function (rep) {
	this.repeatables.push(rep);
};

PageElementWriter.prototype.popFromRepeatables = function () {
	this.repeatables.pop();
};

PageElementWriter.prototype.context = function () {
	return this.writer.context;
};

module.exports = PageElementWriter;
