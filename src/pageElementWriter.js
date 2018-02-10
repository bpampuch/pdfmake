'use strict';

var ElementWriter = require('./elementWriter');

/**
 * An extended ElementWriter which can handle:
 * - page-breaks (it adds new pages when there's not enough space left),
 * - repeatable fragments (like table-headers, which are repeated everytime
 *                         a page-break occurs)
 * - transactions (used for unbreakable-blocks when we want to make sure
 *                 whole block will be rendered on the same page)
 */
class PageElementWriter {
	constructor(context, tracker) {
		this.transactionLevel = 0;
		this.repeatables = [];
		this.tracker = tracker;
		this.writer = new ElementWriter(context, tracker);
	}

	addLine(line, dontUpdateContextPosition, index) {
		return fitOnPage(this, function (self) {
			return self.writer.addLine(line, dontUpdateContextPosition, index);
		});
	}

	addImage(image, index) {
		return fitOnPage(this, function (self) {
			return self.writer.addImage(image, index);
		});
	}

	addQr(qr, index) {
		return fitOnPage(this, function (self) {
			return self.writer.addQr(qr, index);
		});
	}

	addVector(vector, ignoreContextX, ignoreContextY, index) {
		return this.writer.addVector(vector, ignoreContextX, ignoreContextY, index);
	}

	beginClip(width, height) {
		return this.writer.beginClip(width, height);
	}

	endClip() {
		return this.writer.endClip();
	}

	alignCanvas(node) {
		this.writer.alignCanvas(node);
	}

	addFragment(fragment, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition) {
		if (!this.writer.addFragment(fragment, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition)) {
			this.moveToNextPage();
			this.writer.addFragment(fragment, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition);
		}
	}

	moveToNextPage(pageOrientation) {

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
	}

	beginUnbreakableBlock(width, height) {
		if (this.transactionLevel++ === 0) {
			this.originalX = this.writer.context.x;
			this.writer.pushContext(width, height);
		}
	}

	commitUnbreakableBlock(forcedX, forcedY) {
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
	}

	currentBlockToRepeatable() {
		var unbreakableContext = this.writer.context;
		var rep = {items: []};

		unbreakableContext.pages[0].items.forEach(function (item) {
			rep.items.push(item);
		});

		rep.xOffset = this.originalX;

		//TODO: vectors can influence height in some situations
		rep.height = unbreakableContext.y;

		return rep;
	}

	pushToRepeatables(rep) {
		this.repeatables.push(rep);
	}

	popFromRepeatables() {
		this.repeatables.pop();
	}

	context() {
		return this.writer.context;
	}
}

function fitOnPage(self, addFct) {
	var position = addFct(self);
	if (!position) {
		self.moveToNextPage();
		position = addFct(self);
	}
	return position;
}

module.exports = PageElementWriter;
