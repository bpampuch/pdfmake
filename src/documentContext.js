/* jslint node: true */
'use strict';

/**
* Creates an instance of DocumentContext - a store for current x, y positions and available width/height.
* It facilitates column divisions and vertical sync
*/
function DocumentContext(pageSize, pageMargins, addFirstPageAutomatically) {
	this.pages = [];

	this.pageSize = pageSize;
	this.pageMargins = pageMargins;

	this.x = pageMargins.left;
	this.availableWidth = pageSize.width - pageMargins.left - pageMargins.right;
	this.availableHeight = 0;
	this.page = -1;

	this.snapshots = [];

	if (addFirstPageAutomatically) this.addPage();
}

DocumentContext.prototype.beginColumnGroup = function() {
	this.snapshots.push({
		x: this.x,
		y: this.y,
		availableHeight: this.availableHeight,
		availableWidth: this.availableWidth,
		page: this.page,
		bottomMost: { y: this.y, page: this.page }
	});

	this.lastColumnWidth = 0;
};

DocumentContext.prototype.beginColumn = function(width, offset) {
	var saved = this.snapshots[this.snapshots.length - 1];
	saved.bottomMost = bottomMostContext(this, saved.bottomMost);

	this.page = saved.page;
	this.x = this.x + this.lastColumnWidth + (offset || 0);
	this.y = saved.y;
	this.availableWidth = width;	//saved.availableWidth - offset;
	this.availableHeight = saved.availableHeight;

	this.lastColumnWidth = width;
};

DocumentContext.prototype.completeColumnGroup = function() {
	var saved = this.snapshots.pop();
	var bottomMost = bottomMostContext(this, saved.bottomMost);

	this.x = saved.x;
	this.y = bottomMost.y;
	this.page = bottomMost.page;
	this.availableWidth = saved.availableWidth;
	this.availableHeight = bottomMost.availableHeight;
};

DocumentContext.prototype.addMargin = function(left, right) {
	this.x += left;
	this.availableWidth -= left + (right || 0);
};

DocumentContext.prototype.moveDown = function(offset) {
	this.y += offset;
	this.availableHeight -= offset;

	return this.availableHeight > 0;
};

DocumentContext.prototype.moveToPageTop = function() {
	this.y = this.pageMargins.top;
	this.availableHeight = this.pageSize.height - this.pageMargins.top - this.pageMargins.bottom;
};

DocumentContext.prototype.addPage = function() {
	var page = { lines: [], vectors: [] };
	this.pages.push(page);
	this.page = this.pages.length - 1;
	this.moveToPageTop();

	return page;
};

DocumentContext.prototype.getCurrentPage = function() {
	if (this.page < 0 || this.page >= this.pages.length) return null;

	return this.pages[this.page];
};

DocumentContext.prototype.createUnbreakableSubcontext = function() {
	var height = this.pageSize.height - this.pageMargins.top - this.pageMargins.bottom;
	var width = this.availableWidth;

	var ctx = new DocumentContext({ width: width, height: height }, { left: 0, right: 0, top: 0, bottom: 0 });
	ctx.addPage();

	return ctx;
};

function bottomMostContext(c1, c2) {
	var r;

	if (c1.page > c2.page) r = c1;
	else if (c2.page > c1.page) r = c2;
	else r = (c1.y > c2.y) ? c1 : c2;

	return {
		page: r.page,
		x: r.x,
		y: r.y,
		availableHeight: r.availableHeight,
		availableWidth: r.availableWidth
	};
}

//****TESTS**** (remove first '/' to comment)
DocumentContext.bottomMostContext = bottomMostContext;
// */

module.exports = DocumentContext;
