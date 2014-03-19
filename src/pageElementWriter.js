/* jslint node: true */
'use strict';

var ElementWriter = require('./elementWriter');

/**
* Creates an instance of PageElementWriter - line/vector writer
* used by LayoutBuilder.
*
* It creates new pages when required, supports repeatable fragments
* (ie. table headers), headers and footers.
*/
function PageElementWriter(context, tracker) {
	this.originalContext = this.context = context;
	this.transactionLevel = 0;
	this.repeatables = [];

	this.writer = new ElementWriter(context, tracker);
}

PageElementWriter.prototype.addLine = function(line, dontUpdateContextPosition) {
	if (!this.writer.addLine(line, dontUpdateContextPosition)) {
		this.moveToNextPage();
		this.writer.addLine(line, dontUpdateContextPosition);
	}
};

PageElementWriter.prototype.addVector = function(vector, ignoreContextX, ignoreContextY) {
	this.writer.addVector(vector, ignoreContextX, ignoreContextY);
};

PageElementWriter.prototype.addImage = function(image) {
	if(!this.writer.addImage(image)) {
		this.moveToNextPage();
		this.writer.addImage(image);
	}
};

PageElementWriter.prototype.addFragment = function(fragment) {
	if (!this.writer.addFragment(fragment)) {
		this.moveToNextPage();
		this.writer.addFragment(fragment);
	}
};

PageElementWriter.prototype.moveToNextPage = function() {
	var nextPageIndex = this.context.page + 1;

	var prevPage = this.context.page;
	var prevY = this.context.y;

	if (nextPageIndex >= this.context.pages.length) {
		// create new Page
		var page = { lines: [], vectors: [], images:[] };
		this.context.pages.push(page);
		this.context.page = nextPageIndex;
		this.context.moveToPageTop();

		// add repeatable fragments
		this.repeatables.forEach(function(rep) {
			this.writer.addFragment(rep, true);
		}, this);
	} else {
		this.context.page = nextPageIndex;
		this.context.moveToPageTop();

		this.repeatables.forEach(function(rep) {
			this.context.moveDown(rep.height);
		}, this);
	}

	this.writer.tracker.emit('pageChanged', {
		prevPage: prevPage,
		prevY: prevY,
		y: this.context.y
	});
};

PageElementWriter.prototype.beginUnbreakableBlock = function() {
	if (this.transactionLevel++ === 0) {
		this.transactionContext = this.context.createUnbreakableSubcontext();
		this._activateTransactionContext();
	}
};

PageElementWriter.prototype.commitUnbreakableBlock = function() {
	if (--this.transactionLevel === 0) {
		this._removeTransactionContext();

		if(this.transactionContext.pages.length > 0) {
			// no support for multi-page unbreakableBlocks
			var fragment = this.transactionContext.pages[0];

			//TODO: vectors can influence height in some situations
			fragment.height = this.transactionContext.y;

			this.addFragment(fragment);
		}
	}
};

PageElementWriter.prototype.unbreakableBlockToRepeatable = function() {
	var rep = { lines: [], vectors: [], images: [] };

	this.transactionContext.pages[0].lines.forEach(function(line) {
		rep.lines.push(line);
	});

	this.transactionContext.pages[0].vectors.forEach(function(vector) {
		rep.vectors.push(vector);
	});

	this.transactionContext.pages[0].images.forEach(function(img) {
		rep.images.push(img);
	});

	rep.xOffset = this.originalContext.x;

	//TODO: vectors can influence height in some situations
	rep.height = this.transactionContext.y;

	return rep;
};

PageElementWriter.prototype.pushToRepeatables = function(rep) {
	this.repeatables.push(rep);
};

PageElementWriter.prototype.popFromRepeatables = function() {
	this.repeatables.pop();
};


PageElementWriter.prototype._activateTransactionContext = function() {
	this.context = this.transactionContext;
	this.writer.setContext(this.context);
};

PageElementWriter.prototype._removeTransactionContext = function() {
	this.context = this.originalContext;
	this.writer.setContext(this.context);
};

module.exports = PageElementWriter;
