/* jslint node: true */
'use strict';

var ElementWriter = require('./elementWriter');

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

PageElementWriter.prototype.addQr = function (qr, index) {
	return fitOnPage(this, function (self) {
		return self.writer.addQr(qr, index);
	});
};

PageElementWriter.prototype.addVector = function (vector, ignoreContextX, ignoreContextY, index) {
	return this.writer.addVector(vector, ignoreContextX, ignoreContextY, index);
};

PageElementWriter.prototype.addFragment = function (fragment, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition) {
	if (!this.writer.addFragment(fragment, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition)) {
		this.moveToNextPage();
		this.writer.addFragment(fragment, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition);
	}
};

PageElementWriter.prototype.moveToNextPage = function (pageOrientation) {

	var nextPage = this.writer.context.moveToNextPage(pageOrientation);

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
		y: nextPage.y
	});
};

PageElementWriter.prototype.beginUnbreakableBlock = function (width, height) {
	if (this.transactionLevel++ === 0) {
		this.originalX = this.writer.context.x;
		this.writer.pushContext(width, height);
	}
};

PageElementWriter.prototype.commitUnbreakableBlock = function (forcedX, forcedY) {
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
				this.addFragment(fragment);
			}
		}
	}
};

PageElementWriter.prototype.currentBlockToRepeatable = function () {
	var unbreakableContext = this.writer.context;
	var rep = {items: []};

	unbreakableContext.pages[0].items.forEach(function (item) {
		rep.items.push(item);
	});

	rep.xOffset = this.originalX;

	//TODO: vectors can influence height in some situations
	rep.height = unbreakableContext.y;

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
