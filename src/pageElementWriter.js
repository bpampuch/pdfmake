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

PageElementWriter.prototype.addLine = function(line, dontUpdateContextPosition, index) {
	if (!this.writer.addLine(line, dontUpdateContextPosition, index)) {
		this.moveToNextPage();
		this.writer.addLine(line, dontUpdateContextPosition, index);
	}
};

PageElementWriter.prototype.addImage = function(image, index) {
	if(!this.writer.addImage(image, index)) {
		this.moveToNextPage();
		this.writer.addImage(image, index);
	}
};

PageElementWriter.prototype.addVector = function(vector, ignoreContextX, ignoreContextY, index) {
	this.writer.addVector(vector, ignoreContextX, ignoreContextY, index);
};

PageElementWriter.prototype.addFragment = function(fragment, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition) {
	if (!this.writer.addFragment(fragment, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition)) {
		this.moveToNextPage();
		this.writer.addFragment(fragment, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition);
	}
};

PageElementWriter.prototype.moveToNextPage = function() {
	var nextPageIndex = this.writer.context.page + 1;

	var prevPage = this.writer.context.page;
	var prevY = this.writer.context.y;

	if (nextPageIndex >= this.writer.context.pages.length) {
		// create new Page
        this.writer.context.addPage();

		// add repeatable fragments
		this.repeatables.forEach(function(rep) {
			this.writer.addFragment(rep, true);
		}, this);
	} else {
		this.writer.context.page = nextPageIndex;
		this.writer.context.moveToPageTop();

		this.repeatables.forEach(function(rep) {
			this.writer.context.moveDown(rep.height);
		}, this);
	}

	this.writer.tracker.emit('pageChanged', {
		prevPage: prevPage,
		prevY: prevY,
		y: this.writer.context.y
	});
};

PageElementWriter.prototype.beginUnbreakableBlock = function(width, height) {
	if (this.transactionLevel++ === 0) {
		this.originalX = this.writer.context.x;
		this.writer.pushContext(width, height);
	}
};

PageElementWriter.prototype.commitUnbreakableBlock = function(forcedX, forcedY) {
	if (--this.transactionLevel === 0) {
		var unbreakableContext = this.writer.context;
		this.writer.popContext();

		if(unbreakableContext.pages.length > 0) {
			// no support for multi-page unbreakableBlocks
			var fragment = unbreakableContext.pages[0];
			fragment.xOffset = forcedX;
			fragment.yOffset = forcedY;

			//TODO: vectors can influence height in some situations
			fragment.height = unbreakableContext.y;

			if (forcedX !== undefined || forcedY !== undefined) {
				this.writer.addFragment(fragment, true, true, true);
			} else {
				this.addFragment(fragment);
			}
		}
	}
};

PageElementWriter.prototype.currentBlockToRepeatable = function() {
	var unbreakableContext = this.writer.context;
	var rep = { items: [] };

    unbreakableContext.pages[0].items.forEach(function(item) {
        rep.items.push(item);
    });

	rep.xOffset = this.originalX;

	//TODO: vectors can influence height in some situations
	rep.height = unbreakableContext.y;

	return rep;
};

PageElementWriter.prototype.pushToRepeatables = function(rep) {
	this.repeatables.push(rep);
};

PageElementWriter.prototype.popFromRepeatables = function() {
	this.repeatables.pop();
};

PageElementWriter.prototype.context = function() {
	return this.writer.context;
};

module.exports = PageElementWriter;
