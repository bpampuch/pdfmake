/* jslint node: true */
'use strict';

var TraversalTracker = require('./traversalTracker');
var isString = require('./helpers').isString;

/**
 * Creates an instance of DocumentContext - a store for current x, y positions and available width/height.
 * It facilitates column divisions and vertical sync
 *
 * @param {object} pageSize - current page size including width, height, orientation
 * @param {object} pageMargins - normalized page margins with top/right/bottom/left
 */
function DocumentContext(pageSize, pageMargins) {
	this.pages = [];
	this.pageMargins = pageMargins;

	this.x = pageMargins.left;
	this.availableWidth = pageSize.width - pageMargins.left - pageMargins.right;
	this.availableHeight = 0;
	this.page = -1;

	this.snapshots = [];

	this.endingCell = null;

	this.tracker = new TraversalTracker();
	this.backgroundLength = [];
	this.marginXTopParent = null;

	this.addPage(pageSize);
}

DocumentContext.prototype.beginColumnGroup = function (marginXTopParent, bottomByPage) {
	bottomByPage = bottomByPage || {};
	this.snapshots.push({
		x: this.x,
		y: this.y,
		availableHeight: this.availableHeight,
		availableWidth: this.availableWidth,
		page: this.page,
		bottomByPage: bottomByPage,
		bottomMost: {
			x: this.x,
			y: this.y,
			availableHeight: this.availableHeight,
			availableWidth: this.availableWidth,
			page: this.page
		},
		endingCell: this.endingCell,
		lastColumnWidth: this.lastColumnWidth,
		marginXTopParent: this.marginXTopParent
	});

	this.lastColumnWidth = 0;
	if (marginXTopParent) {
		this.marginXTopParent = marginXTopParent;
	}
};

DocumentContext.prototype.updateBottomByPage = function () {
	if (!this.snapshots.length) {
		return;
	}
	var lastSnapshot = this.snapshots[this.snapshots.length - 1];
	var lastPage = this.page;
	var previousBottom = -Number.MIN_VALUE;
	if (lastSnapshot.bottomByPage[lastPage]) {
		previousBottom = lastSnapshot.bottomByPage[lastPage];
	}
	lastSnapshot.bottomByPage[lastPage] = Math.max(previousBottom, this.y);
};

DocumentContext.prototype.resetMarginXTopParent = function () {
	this.marginXTopParent = null;
};

DocumentContext.prototype.beginColumn = function (width, offset, endingCell, heightOffset) {
	var saved = this.snapshots[this.snapshots.length - 1];
	
	// If starting a NEW spanning column, capture its context NOW (before we reset)
	if (endingCell && !this.endingCell) {
		// First spanning column - save current context before we reset
		endingCell._columnEndingContext = {
			page: this.page,
			x: this.x,
			y: this.y,
			availableHeight: this.availableHeight,
			availableWidth: this.availableWidth,
			lastColumnWidth: this.lastColumnWidth
		};
	}
	
	// Process the PREVIOUS column's endingCell and/or update bottomMost
	this.calculateBottomMost(saved, this.endingCell, endingCell);
	
	this.endingCell = endingCell;
	this.page = saved.page;
	this.x = this.x + this.lastColumnWidth + (offset || 0);
	this.y = saved.y;
	this.availableWidth = width;	//saved.availableWidth - offset;
	this.availableHeight = saved.availableHeight - (heightOffset || 0);

	this.lastColumnWidth = width;
};

DocumentContext.prototype.calculateBottomMost = function (destContext, previousEndingCell, currentEndingCell) {
	// If the previous column had an endingCell (spanning), save its context now
	if (previousEndingCell) {
		if (!previousEndingCell._columnEndingContext) {
			// First spanning column: save current context
			this.saveContextInEndingCell(previousEndingCell);
		}
		// Clear the endingCell reference
		this.endingCell = null;
	}
	
	// Update bottomMost if the current column is NOT spanning
	if (!currentEndingCell) {
		var bottomMost = destContext.bottomMost ? destContext.bottomMost : destContext;
		destContext.bottomMost = bottomMostContext(this, bottomMost);
	} else if (previousEndingCell) {
		// Current column IS spanning, but previous was also spanning
		// Save bottomMost (shortest of non-spanning columns so far) to current endingCell
		currentEndingCell._columnEndingContext = {
			page: destContext.bottomMost.page,
			x: destContext.bottomMost.x,
			y: destContext.bottomMost.y,
			availableHeight: destContext.bottomMost.availableHeight,
			availableWidth: destContext.bottomMost.availableWidth,
			lastColumnWidth: destContext.bottomMost.lastColumnWidth
		};
	}
};

DocumentContext.prototype.markEnding = function (endingCell, originalXOffset, discountY) {
	originalXOffset = originalXOffset || 0;
	discountY = discountY || 0;
	this.page = endingCell._columnEndingContext.page;
	this.x = endingCell._columnEndingContext.x + originalXOffset;
	this.y = endingCell._columnEndingContext.y - discountY;
	this.availableWidth = endingCell._columnEndingContext.availableWidth;
	this.availableHeight = endingCell._columnEndingContext.availableHeight;
	this.lastColumnWidth = endingCell._columnEndingContext.lastColumnWidth;
};

DocumentContext.prototype.saveContextInEndingCell = function (endingCell) {
	endingCell._columnEndingContext = {
		page: this.page,
		x: this.x,
		y: this.y,
		availableHeight: this.availableHeight,
		availableWidth: this.availableWidth,
		lastColumnWidth: this.lastColumnWidth
	};
};

DocumentContext.prototype.completeColumnGroup = function (height, endingCell) {
	var saved = this.snapshots.pop();

	// Process any remaining endingCell from the last column
	// This handles the case where the last column is spanning and needs its context saved
	if (this.endingCell && !this.endingCell._columnEndingContext) {
		// Last column is spanning and hasn't been saved yet - save it now
		this.saveContextInEndingCell(this.endingCell);
	}
	this.calculateBottomMost(saved, null, null);

	var hasSpanningColumn = !!(endingCell || this.endingCell);
	this.endingCell = null;
	this.x = saved.x;
	
	var y;
	if (hasSpanningColumn) {
		// If there's a spanning column, use the current y position
		// The bottomMost was saved to the endingCell, but we continue at current y
		y = this.y;
	} else {
		// No spanning column, use the bottomMost
		y = saved.bottomMost.y;
	}
	
	if (height) {
		if (saved.page === saved.bottomMost.page) {
			if ((saved.y + height) > y) {
				y = saved.y + height;
			}
		} else {
			y += height;
		}
	}

	this.y = y;
	this.page = saved.bottomMost.page;
	this.height = saved.bottomMost.y - saved.y;
	this.availableHeight = saved.bottomMost.availableHeight;
	if (height) {
		this.availableHeight -= (y - saved.bottomMost.y);
	}
	this.availableWidth = saved.availableWidth;
	this.lastColumnWidth = saved.lastColumnWidth;
	this.marginXTopParent = saved.marginXTopParent;

	return saved.bottomByPage;
};

DocumentContext.prototype.addMargin = function (left, right) {
	this.x += left;
	this.availableWidth -= left + (right || 0);
};

DocumentContext.prototype.moveDown = function (offset) {
	this.y += offset;
	this.availableHeight -= offset;

	return this.availableHeight > 0;
};

DocumentContext.prototype.initializePage = function () {
	this.y = this.pageMargins.top;
	this.availableHeight = this.getCurrentPage().pageSize.height - this.pageMargins.top - this.pageMargins.bottom;
	this.fullHeight = this.availableHeight;
	var snapshot = this.pageSnapshot();
	var pageCtx = snapshot.pageCtx;
	pageCtx.availableWidth = this.getCurrentPage().pageSize.width - this.pageMargins.left - this.pageMargins.right;
	if (snapshot.isSnapshot && this.marginXTopParent) {
		pageCtx.availableWidth -= this.marginXTopParent[0];
		pageCtx.availableWidth -= this.marginXTopParent[1];
	}
};

DocumentContext.prototype.pageSnapshot = function () {
	if (this.snapshots[0]) {
		return {pageCtx: this.snapshots[0], isSnapshot: true};
	} else {
		return {pageCtx: this, isSnapshot: false};
	}
};

DocumentContext.prototype.moveTo = function (x, y) {
	if (x !== undefined && x !== null) {
		this.x = x;
		this.availableWidth = this.getCurrentPage().pageSize.width - this.x - this.pageMargins.right;
	}
	if (y !== undefined && y !== null) {
		this.y = y;
		this.availableHeight = this.getCurrentPage().pageSize.height - this.y - this.pageMargins.bottom;
	}
};

DocumentContext.prototype.moveToRelative = function (x, y) {
	if (x !== undefined && x !== null) {
		this.x = this.x + x;
	}
	if (y !== undefined && y !== null) {
		this.y = this.y + y;
	}
};

DocumentContext.prototype.beginDetachedBlock = function () {
	this.snapshots.push({
		x: this.x,
		y: this.y,
		availableHeight: this.availableHeight,
		availableWidth: this.availableWidth,
		page: this.page,
		endingCell: this.endingCell,
		lastColumnWidth: this.lastColumnWidth,
		marginXTopParent: this.marginXTopParent
	});
};

DocumentContext.prototype.endDetachedBlock = function () {
	var saved = this.snapshots.pop();

	this.x = saved.x;
	this.y = saved.y;
	this.availableWidth = saved.availableWidth;
	this.availableHeight = saved.availableHeight;
	this.page = saved.page;
	this.endingCell = saved.endingCell;
	this.lastColumnWidth = saved.lastColumnWidth;
	this.marginXTopParent = saved.marginXTopParent;
};

function pageOrientation(pageOrientationString, currentPageOrientation) {
	if (pageOrientationString === undefined) {
		return currentPageOrientation;
	} else if (isString(pageOrientationString) && (pageOrientationString.toLowerCase() === 'landscape')) {
		return 'landscape';
	} else {
		return 'portrait';
	}
}

var getPageSize = function (currentPage, newPageOrientation) {

	newPageOrientation = pageOrientation(newPageOrientation, currentPage.pageSize.orientation);

	if (newPageOrientation !== currentPage.pageSize.orientation) {
		return {
			orientation: newPageOrientation,
			width: currentPage.pageSize.height,
			height: currentPage.pageSize.width
		};
	} else {
		return {
			orientation: currentPage.pageSize.orientation,
			width: currentPage.pageSize.width,
			height: currentPage.pageSize.height
		};
	}

};


DocumentContext.prototype.moveToNextPage = function (pageOrientation) {
	var nextPageIndex = this.page + 1;

	var prevPage = this.page;
	var prevY = this.y;
	if (this.snapshots.length > 0) {
		var lastSnapshot = this.snapshots[this.snapshots.length - 1];
		if (lastSnapshot.bottomMost && lastSnapshot.bottomMost.y !== undefined) {
			prevY = Math.max(this.y, lastSnapshot.bottomMost.y);
		}
	}

	var createNewPage = nextPageIndex >= this.pages.length;
	if (createNewPage) {
		var currentAvailableWidth = this.availableWidth;
		var currentPageOrientation = this.getCurrentPage().pageSize.orientation;

		var pageSize = getPageSize(this.getCurrentPage(), pageOrientation);
		this.addPage(pageSize);

		if (currentPageOrientation === pageSize.orientation) {
			this.availableWidth = currentAvailableWidth;
		}
	} else {
		this.page = nextPageIndex;
		this.initializePage();
	}

	return {
		newPageCreated: createNewPage,
		prevPage: prevPage,
		prevY: prevY,
		y: this.y
	};
};


DocumentContext.prototype.addPage = function (pageSize) {
	var page = {items: [], pageSize: pageSize};
	this.pages.push(page);
	this.backgroundLength.push(0);
	this.page = this.pages.length - 1;
	this.initializePage();

	this.tracker.emit('pageAdded');

	return page;
};

DocumentContext.prototype.getCurrentPage = function () {
	if (this.page < 0 || this.page >= this.pages.length) {
		return null;
	}

	return this.pages[this.page];
};

DocumentContext.prototype.getCurrentPosition = function () {
	var pageSize = this.getCurrentPage().pageSize;
	var innerHeight = pageSize.height - this.pageMargins.top - this.pageMargins.bottom;
	var innerWidth = pageSize.width - this.pageMargins.left - this.pageMargins.right;

	return {
		pageNumber: this.page + 1,
		pageOrientation: pageSize.orientation,
		pageInnerHeight: innerHeight,
		pageInnerWidth: innerWidth,
		left: this.x,
		top: this.y,
		verticalRatio: ((this.y - this.pageMargins.top) / innerHeight),
		horizontalRatio: ((this.x - this.pageMargins.left) / innerWidth)
	};
};

function bottomMostContext(c1, c2) {
	var r;

	if (c1.page > c2.page) {
		r = c1;
	} else if (c2.page > c1.page) {
		r = c2;
	} else {
		r = (c1.y > c2.y) ? c1 : c2;
	}

	return {
		page: r.page,
		x: r.x,
		y: r.y,
		availableHeight: r.availableHeight,
		availableWidth: r.availableWidth
	};
}

/****TESTS**** (add a leading '/' to uncomment)
 DocumentContext.bottomMostContext = bottomMostContext;
 // */

module.exports = DocumentContext;
