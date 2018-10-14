import { isValue } from './helpers/variableType';

/**
 * A store for current x, y positions and available width/height.
 * It facilitates column divisions and vertical sync
 */
class DocumentContext {

	constructor(pageSize, pageMargins) {
		this.pages = [];
		this.snapshots = [];
		this.backgroundLength = [];

		this.pageMargins = pageMargins;

		this.x = pageMargins.left;
		this.y = null;
		this.availableWidth = pageSize.width - pageMargins.left - pageMargins.right;
		this.availableHeight = 0;
		this.page = -1;

		this.addPage(pageSize);
	}

	getCurrentPage() {
		if (this.page < 0 || this.page >= this.pages.length) {
			return null;
		}

		return this.pages[this.page];
	}

	pageSnapshot() {
		if (this.snapshots[0]) {
			return this.snapshots[0];
		} else {
			return this;
		}
	}

	addPage(pageSize) {
		let page = { items: [], pageSize: pageSize };
		this.pages.push(page);
		this.backgroundLength.push(0);
		this.page = this.pages.length - 1;
		this.initializePage();

		//this.tracker.emit('pageAdded'); // TODO

		return page;
	}

	initializePage() {
		this.y = this.pageMargins.top;
		this.availableHeight = this.getCurrentPage().pageSize.height - this.pageMargins.top - this.pageMargins.bottom;
		this.pageSnapshot().availableWidth = this.getCurrentPage().pageSize.width - this.pageMargins.left - this.pageMargins.right;
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

	addMargin(left, right = 0) {
		this.x += left;
		this.availableWidth -= left + right;
	}

	moveDown(offset) {
		this.y += offset;
		this.availableHeight -= offset;

		return this.availableHeight > 0;
	}

	moveTo(x, y) {
		if (isValue(x)) {
			this.x = x;
			this.availableWidth = this.getCurrentPage().pageSize.width - this.x - this.pageMargins.right;
		}
		if (ixValue(y)) {
			this.y = y;
			this.availableHeight = this.getCurrentPage().pageSize.height - this.y - this.pageMargins.bottom;
		}
	}


}

export default DocumentContext;
