'use strict';

const isUndefined = require('./helpers').isUndefined;
const ElementWriter = require('./elementWriter');

function fitOnPage(self, addFct) {
	let position = addFct(self);
	if (!position) {
		self.moveToNextPage();
		position = addFct(self);
	}
	return position;
}

class PageElementWriter {
	/**
	 * Creates an instance of PageElementWriter - an extended ElementWriter
	 * which can handle:
	 * - page-breaks (it adds new pages when there's not enough space left),
	 * - repeatable fragments (like table-headers, which are repeated everytime
	 *                         a page-break occurs)
	 * - transactions (used for unbreakable-blocks when we want to make sure
	 *                 whole block will be rendered on the same page)
	 */
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
		const nextPage = this.writer.context.moveToNextPage(pageOrientation);
	
		// moveToNextPage is called multiple times for table, because is called for each column
		// and repeatables are inserted only in the first time. If columns are used, is needed
		// call for table in first column and then for table in the second column (is other repeatables).
		this.repeatables.forEach(function (rep) {
			if (isUndefined(rep.insertedOnPages[this.writer.context.page])) {
				rep.insertedOnPages[this.writer.context.page] = true;
				this.writer.addFragment(rep, true);
			} else {
				this.writer.context.moveDown(rep.height);
			}
		}, this);
	
		this.writer.tracker.emit('pageChanged', {
			prevPage: nextPage.prevPage,
			prevY: nextPage.prevY,
			y: this.writer.context.y
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
			const unbreakableContext = this.writer.context;
			this.writer.popContext();
	
			const nbPages = unbreakableContext.pages.length;
			if (nbPages > 0) {
				// no support for multi-page unbreakableBlocks
				const fragment = unbreakableContext.pages[0];
				fragment.xOffset = forcedX;
				fragment.yOffset = forcedY;
	
				//TODO: vectors can influence height in some situations
				if (nbPages > 1) {
					// on out-of-context blocs (headers, footers, background) height should be the whole DocumentContext height
					if (forcedX !== undefined || forcedY !== undefined) {
						fragment.height = unbreakableContext.getCurrentPage().pageSize.height - unbreakableContext.pageMargins.top - unbreakableContext.pageMargins.bottom;
					} else {
						fragment.height = this.writer.context.getCurrentPage().pageSize.height - this.writer.context.pageMargins.top - this.writer.context.pageMargins.bottom;
						for (let i = 0, l = this.repeatables.length; i < l; i++) {
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
		const unbreakableContext = this.writer.context;
		const rep = {items: []};
	
		unbreakableContext.pages[0].items.forEach(function (item) {
			rep.items.push(item);
		});
	
		rep.xOffset = this.originalX;
	
		//TODO: vectors can influence height in some situations
		rep.height = unbreakableContext.y;
	
		rep.insertedOnPages = [];
	
		return rep;
	}

	pushToRepeatables(rep) {
		this.repeatables.push(rep);
	}

	popFromRepeatables() {
		this.repeatables.pop();
	};

	context() {
		return this.writer.context;
	}
}

module.exports = PageElementWriter;
