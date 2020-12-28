import { isString } from './helpers/variableType';
import { EventEmitter } from 'events';

/**
 * A store for current x, y positions and available width/height.
 * It facilitates column divisions and vertical sync
 */
class DocumentContext extends EventEmitter {
	constructor(pageSize, pageMargins) {
		super();
		this.pages = [];

		this.pageMargins = pageMargins;

		this.x = pageMargins.left;
		this.availableWidth = pageSize.width - pageMargins.left - pageMargins.right;
		this.availableHeight = 0;
		this.page = -1;

		this.snapshots = [];
		this.endingCell = null;
		this.backgroundLength = [];

		this.addPage(pageSize);
	}

	beginColumnGroup() {
		this.snapshots.push({
			x: this.x,
			y: this.y,
			availableHeight: this.availableHeight,
			availableWidth: this.availableWidth,
			page: this.page,
			bottomMost: {
				x: this.x,
				y: this.y,
				availableHeight: this.availableHeight,
				availableWidth: this.availableWidth,
				page: this.page
			},
			endingCell: this.endingCell,
			lastColumnWidth: this.lastColumnWidth
		});

		this.lastColumnWidth = 0;
	}

	beginColumn(width, offset, endingCell) {
		let saved = this.snapshots[this.snapshots.length - 1];

		this.calculateBottomMost(saved);

		this.endingCell = endingCell;
		this.page = saved.page;
		this.x = this.x + this.lastColumnWidth + (offset || 0);
		this.y = saved.y;
		this.availableWidth = width;	//saved.availableWidth - offset;
		this.availableHeight = saved.availableHeight;

		this.lastColumnWidth = width;
	}

	calculateBottomMost(destContext) {
		if (this.endingCell) {
			this.saveContextInEndingCell(this.endingCell);
			this.endingCell = null;
		} else {
			destContext.bottomMost = bottomMostContext(this, destContext.bottomMost);
		}
	}

	markEnding(endingCell) {
		this.page = endingCell._columnEndingContext.page;
		this.x = endingCell._columnEndingContext.x;
		this.y = endingCell._columnEndingContext.y;
		this.availableWidth = endingCell._columnEndingContext.availableWidth;
		this.availableHeight = endingCell._columnEndingContext.availableHeight;
		this.lastColumnWidth = endingCell._columnEndingContext.lastColumnWidth;
	}

	saveContextInEndingCell(endingCell) {
		endingCell._columnEndingContext = {
			page: this.page,
			x: this.x,
			y: this.y,
			availableHeight: this.availableHeight,
			availableWidth: this.availableWidth,
			lastColumnWidth: this.lastColumnWidth
		};
	}

	completeColumnGroup(height) {
		let saved = this.snapshots.pop();

		this.calculateBottomMost(saved);

		this.endingCell = null;
		this.x = saved.x;

		let y = saved.bottomMost.y;
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
		this.availableWidth = saved.availableWidth;
		this.availableHeight = saved.bottomMost.availableHeight;
		if (height) {
			this.availableHeight -= (y - saved.bottomMost.y);
		}
		this.lastColumnWidth = saved.lastColumnWidth;
	}

	addMargin(left, right) {
		this.x += left;
		this.availableWidth -= left + (right || 0);
	}

	moveDown(offset) {
		this.y += offset;
		this.availableHeight -= offset;

		return this.availableHeight > 0;
	}

	initializePage() {
		this.y = this.pageMargins.top;
		this.availableHeight = this.getCurrentPage().pageSize.height - this.pageMargins.top - this.pageMargins.bottom;
		this.pageSnapshot().availableWidth = this.getCurrentPage().pageSize.width - this.pageMargins.left - this.pageMargins.right;
	}

	pageSnapshot() {
		if (this.snapshots[0]) {
			return this.snapshots[0];
		} else {
			return this;
		}
	}

	moveTo(x, y) {
		if (x !== undefined && x !== null) {
			this.x = x;
			this.availableWidth = this.getCurrentPage().pageSize.width - this.x - this.pageMargins.right;
		}
		if (y !== undefined && y !== null) {
			this.y = y;
			this.availableHeight = this.getCurrentPage().pageSize.height - this.y - this.pageMargins.bottom;
		}
	}

	moveToRelative(x, y) {
		if (x !== undefined && x !== null) {
			this.x = this.x + x;
		}
		if (y !== undefined && y !== null) {
			this.y = this.y + y;
		}
	}

	beginDetachedBlock() {
		this.snapshots.push({
			x: this.x,
			y: this.y,
			availableHeight: this.availableHeight,
			availableWidth: this.availableWidth,
			page: this.page,
			endingCell: this.endingCell,
			lastColumnWidth: this.lastColumnWidth
		});
	}

	endDetachedBlock() {
		let saved = this.snapshots.pop();

		this.x = saved.x;
		this.y = saved.y;
		this.availableWidth = saved.availableWidth;
		this.availableHeight = saved.availableHeight;
		this.page = saved.page;
		this.endingCell = saved.endingCell;
		this.lastColumnWidth = saved.lastColumnWidth;
	}

	moveToNextPage(pageOrientation) {
		let nextPageIndex = this.page + 1;
		let prevPage = this.page;
		let prevY = this.y;

		let createNewPage = nextPageIndex >= this.pages.length;
		if (createNewPage) {
			let currentAvailableWidth = this.availableWidth;
			let currentPageOrientation = this.getCurrentPage().pageSize.orientation;

			let pageSize = getPageSize(this.getCurrentPage(), pageOrientation);
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
	}

	addPage(pageSize) {
		let page = { items: [], pageSize: pageSize };
		this.pages.push(page);
		this.backgroundLength.push(0);
		this.page = this.pages.length - 1;
		this.initializePage();

		this.emit('pageAdded');

		return page;
	}

	getCurrentPage() {
		if (this.page < 0 || this.page >= this.pages.length) {
			return null;
		}

		return this.pages[this.page];
	}

	getCurrentPosition() {
		let pageSize = this.getCurrentPage().pageSize;
		let innerHeight = pageSize.height - this.pageMargins.top - this.pageMargins.bottom;
		let innerWidth = pageSize.width - this.pageMargins.left - this.pageMargins.right;

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
	}
}

function pageOrientation(pageOrientationString, currentPageOrientation) {
	if (pageOrientationString === undefined) {
		return currentPageOrientation;
	} else if (isString(pageOrientationString) && (pageOrientationString.toLowerCase() === 'landscape')) {
		return 'landscape';
	} else {
		return 'portrait';
	}
}

const getPageSize = (currentPage, newPageOrientation) => {

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


function bottomMostContext(c1, c2) {
	let r;

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

export default DocumentContext;
