import { isString } from './helpers/variableType';
import { EventEmitter } from 'events';

/**
 * A store for current x, y positions and available width/height.
 * It facilitates column divisions and vertical sync
 */
class DocumentContext extends EventEmitter {
	constructor() {
		super();
		this.pages = [];
		this.pageMargins = undefined;
		this.x = undefined;
		this.availableWidth = undefined;
		this.availableHeight = undefined;
		this.page = -1;

		this.snapshots = [];
		this.backgroundLength = [];
	}

	beginColumnGroup(marginXTopParent, bottomByPage = {}, snakingColumns = false, columnGap = 0, columnWidths = null) {
		this.snapshots.push({
			x: this.x,
			y: this.y,
			availableHeight: this.availableHeight,
			availableWidth: this.availableWidth,
			page: this.page,
			bottomByPage: bottomByPage ? bottomByPage : {},
			bottomMost: {
				x: this.x,
				y: this.y,
				availableHeight: this.availableHeight,
				availableWidth: this.availableWidth,
				page: this.page
			},
			lastColumnWidth: this.lastColumnWidth,
			snakingColumns: snakingColumns,
			gap: columnGap,
			columnWidths: columnWidths
		});

		this.lastColumnWidth = 0;
		if (marginXTopParent) {
			this.marginXTopParent = marginXTopParent;
		}
	}

	updateBottomByPage() {
		const lastSnapshot = this.snapshots[this.snapshots.length - 1];
		if (!lastSnapshot) {
			return;
		}
		const lastPage = this.page;
		let previousBottom = -Number.MIN_VALUE;
		if (lastSnapshot.bottomByPage && lastSnapshot.bottomByPage[lastPage]) {
			previousBottom = lastSnapshot.bottomByPage[lastPage];
		}
		if (lastSnapshot.bottomByPage) {
			lastSnapshot.bottomByPage[lastPage] = Math.max(previousBottom, this.y);
		}
	}

	resetMarginXTopParent() {
		this.marginXTopParent = null;
	}

	/**
	 * Find the most recent (deepest) snaking column group snapshot.
	 * @returns {object|null}
	 */
	getSnakingSnapshot() {
		for (let i = this.snapshots.length - 1; i >= 0; i--) {
			if (this.snapshots[i].snakingColumns) {
				return this.snapshots[i];
			}
		}
		return null;
	}

	inSnakingColumns() {
		return !!this.getSnakingSnapshot();
	}

	/**
	 * Check if we're inside a nested non-snaking column group (e.g., a table row)
	 * within an outer snaking column group. This is used to prevent snaking-specific
	 * breaks inside table cells — the table's own page break mechanism should handle
	 * row breaks, and column breaks should happen between rows.
	 * @returns {boolean}
	 */
	isInNestedNonSnakingGroup() {
		for (let i = this.snapshots.length - 1; i >= 0; i--) {
			let snap = this.snapshots[i];
			if (snap.snakingColumns) {
				return false; // Reached snaking snapshot without finding inner group
			}
			if (!snap.overflowed) {
				return true; // Found non-snaking, non-overflowed inner group
			}
		}
		return false;
	}

	beginColumn(width, offset, endingCell) {
		// Find the correct snapshot for this column group.
		// When a snaking column break (moveToNextColumn) occurs during inner column
		// processing, overflowed snapshots may sit above this column group's snapshot.
		// We need to skip past those to find the one from our beginColumnGroup call.
		let saved = this.snapshots[this.snapshots.length - 1];
		if (saved && saved.overflowed) {
			for (let i = this.snapshots.length - 1; i >= 0; i--) {
				if (!this.snapshots[i].overflowed) {
					saved = this.snapshots[i];
					break;
				}
			}
		}

		this.calculateBottomMost(saved, endingCell);

		this.page = saved.page;
		this.x = this.x + this.lastColumnWidth + (offset || 0);
		this.y = saved.y;
		this.availableWidth = width;	//saved.availableWidth - offset;
		this.availableHeight = saved.availableHeight;

		this.lastColumnWidth = width;
	}

	calculateBottomMost(destContext, endingCell) {
		if (endingCell) {
			this.saveContextInEndingCell(endingCell);
		} else {
			destContext.bottomMost = bottomMostContext(this, destContext.bottomMost);
		}
	}

	markEnding(endingCell, originalXOffset, discountY) {
		this.page = endingCell._columnEndingContext.page;
		this.x = endingCell._columnEndingContext.x + originalXOffset;
		this.y = endingCell._columnEndingContext.y - discountY;
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

	completeColumnGroup(height, endingCell) {
		let saved = this.snapshots.pop();

		// Track the maximum bottom position across all columns (including overflowed).
		// Critical for snaking: content after columns must appear below the tallest column.
		let maxBottomY = this.y;
		let maxBottomPage = this.page;
		let maxBottomAvailableHeight = this.availableHeight;

		// Pop overflowed snapshots created by moveToNextColumn (snaking columns).
		// Merge their bottomMost values to find the true maximum.
		while (saved && saved.overflowed) {
			let bm = bottomMostContext(
				{
					page: maxBottomPage,
					y: maxBottomY,
					availableHeight: maxBottomAvailableHeight
				},
				saved.bottomMost || {}
			);
			maxBottomPage = bm.page;
			maxBottomY = bm.y;
			maxBottomAvailableHeight = bm.availableHeight;
			saved = this.snapshots.pop();
		}

		if (!saved) {
			return {};
		}

		// Apply the max bottom from all overflowed columns to this base snapshot
		if (
			maxBottomPage > saved.bottomMost.page ||
			(maxBottomPage === saved.bottomMost.page &&
				maxBottomY > saved.bottomMost.y)
		) {
			saved.bottomMost = {
				x: saved.x,
				y: maxBottomY,
				page: maxBottomPage,
				availableHeight: maxBottomAvailableHeight,
				availableWidth: saved.availableWidth
			};
		}

		this.calculateBottomMost(saved, endingCell);

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

		if (height && (saved.bottomMost.y - saved.y < height)) {
			this.height = height;
		} else {
			this.height = saved.bottomMost.y - saved.y;
		}

		this.lastColumnWidth = saved.lastColumnWidth;
		return saved.bottomByPage;
	}

	/**
	 * Move to the next column in a column group (snaking columns).
	 * Creates an overflowed snapshot to track that we've moved to the next column.
	 * @returns {object} Position info for the new column
	 */
	moveToNextColumn() {
		let prevY = this.y;
		let snakingSnapshot = this.getSnakingSnapshot();

		if (!snakingSnapshot) {
			return { prevY: prevY, y: this.y };
		}

		// Update snaking snapshot's bottomMost with current position BEFORE resetting.
		// This captures where content reached in the current column (overflow point).
		this.calculateBottomMost(snakingSnapshot, null);

		// Calculate new X position: move right by current column width + gap
		let overflowCount = 0;
		for (let i = this.snapshots.length - 1; i >= 0; i--) {
			if (this.snapshots[i].overflowed) {
				overflowCount++;
			} else {
				break;
			}
		}

		let currentColumnWidth = (snakingSnapshot.columnWidths && snakingSnapshot.columnWidths[overflowCount]) || this.lastColumnWidth || this.availableWidth;
		let nextColumnWidth = (snakingSnapshot.columnWidths && snakingSnapshot.columnWidths[overflowCount + 1]) || currentColumnWidth;

		this.lastColumnWidth = nextColumnWidth;

		let newX = this.x + (currentColumnWidth || 0) + (snakingSnapshot.gap || 0);
		let newY = snakingSnapshot.y;

		this.snapshots.push({
			x: newX,
			y: newY,
			availableHeight: snakingSnapshot.availableHeight,
			availableWidth: nextColumnWidth,
			page: this.page,
			overflowed: true,
			bottomMost: {
				x: newX,
				y: newY,
				availableHeight: snakingSnapshot.availableHeight,
				availableWidth: nextColumnWidth,
				page: this.page
			},
			lastColumnWidth: nextColumnWidth,
			snakingColumns: true,
			gap: snakingSnapshot.gap,
			columnWidths: snakingSnapshot.columnWidths
		});

		this.x = newX;
		this.y = newY;
		this.availableHeight = snakingSnapshot.availableHeight;
		this.availableWidth = nextColumnWidth;

		// Sync non-overflowed inner snapshots (e.g. inner column groups for
		// product/price rows) with the new snaking column position.
		// Without this, inner beginColumn would read stale y/page/x values.
		for (let i = this.snapshots.length - 2; i >= 0; i--) {
			let snapshot = this.snapshots[i];
			if (snapshot.overflowed || snapshot.snakingColumns) {
				break; // Stop at first overflowed or snaking snapshot
			}
			snapshot.x = newX;
			snapshot.y = newY;
			snapshot.page = this.page;
			snapshot.availableHeight = snakingSnapshot.availableHeight;
			if (snapshot.bottomMost) {
				snapshot.bottomMost.x = newX;
				snapshot.bottomMost.y = newY;
				snapshot.bottomMost.page = this.page;
				snapshot.bottomMost.availableHeight = snakingSnapshot.availableHeight;
			}
		}

		return { prevY: prevY, y: this.y };
	}

	/**
	 * Reset snaking column state when moving to a new page.
	 * Clears overflowed snapshots, resets X to left margin, sets width to first column,
	 * and syncs all snapshots to new page coordinates.
	 */
	resetSnakingColumnsForNewPage() {
		let snakingSnapshot = this.getSnakingSnapshot();
		if (!snakingSnapshot) {
			return;
		}

		let pageTopY = this.pageMargins.top;
		let pageInnerHeight = this.getCurrentPage().pageSize.height - this.pageMargins.top - this.pageMargins.bottom;

		// When moving to new page, start at first column.
		// Reset width to FIRST column width, not last column from previous page.
		let firstColumnWidth = snakingSnapshot.columnWidths ? snakingSnapshot.columnWidths[0] : (this.lastColumnWidth || this.availableWidth);

		// Clean up overflowed snapshots
		while (this.snapshots.length > 1 && this.snapshots[this.snapshots.length - 1].overflowed) {
			this.snapshots.pop();
		}

		// Reset X to start of first column (left margin)
		if (this.marginXTopParent) {
			this.x = this.pageMargins.left + this.marginXTopParent[0];
		} else {
			this.x = this.pageMargins.left;
		}
		this.availableWidth = firstColumnWidth;
		this.lastColumnWidth = firstColumnWidth;

		// Sync all snapshots to new page state.
		// When page break occurs within snaking columns, update ALL snapshots
		// (not just snaking column snapshots) to reflect new page coordinates.
		// This ensures nested structures (like inner product/price columns)
		// don't retain stale values that would cause layout corruption.
		for (let i = 0; i < this.snapshots.length; i++) {
			let snapshot = this.snapshots[i];
			let isSnakingSnapshot = !!snapshot.snakingColumns;
			snapshot.x = this.x;
			snapshot.y = isSnakingSnapshot ? pageTopY : this.y;
			snapshot.availableHeight = isSnakingSnapshot ? pageInnerHeight : this.availableHeight;
			snapshot.page = this.page;
			if (snapshot.bottomMost) {
				snapshot.bottomMost.x = this.x;
				snapshot.bottomMost.y = isSnakingSnapshot ? pageTopY : this.y;
				snapshot.bottomMost.availableHeight = isSnakingSnapshot ? pageInnerHeight : this.availableHeight;
				snapshot.bottomMost.page = this.page;
			}
		}
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
		const { pageCtx, isSnapshot } = this.pageSnapshot();
		pageCtx.availableWidth = this.getCurrentPage().pageSize.width - this.pageMargins.left - this.pageMargins.right;
		if (isSnapshot && this.marginXTopParent) {
			pageCtx.availableWidth -= this.marginXTopParent[0];
			pageCtx.availableWidth -= this.marginXTopParent[1];
		}
	}

	pageSnapshot() {
		if (this.snapshots[0]) {
			return { pageCtx: this.snapshots[0], isSnapshot: true };
		} else {
			return { pageCtx: this, isSnapshot: false };
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
		this.lastColumnWidth = saved.lastColumnWidth;
	}

	moveToNextPage(pageOrientation) {
		let nextPageIndex = this.page + 1;
		let prevPage = this.page;
		let prevY = this.y;

		// If we are in a column group
		if (this.snapshots.length > 0) {
			let lastSnapshot = this.snapshots[this.snapshots.length - 1];
			// We have to update prevY accordingly by also taking into consideration
			// the 'y' of cells that don't break page
			if (lastSnapshot.bottomMost && lastSnapshot.bottomMost.y) {
				prevY = Math.max(this.y, lastSnapshot.bottomMost.y);
			}
		}

		let createNewPage = nextPageIndex >= this.pages.length;
		if (createNewPage) {
			let currentAvailableWidth = this.availableWidth;
			let currentPageOrientation = this.getCurrentPage().pageSize.orientation;

			let pageSize = getPageSize(this.getCurrentPage(), pageOrientation);
			this.addPage(pageSize, null, this.getCurrentPage().customProperties);

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

	addPage(pageSize, pageMargin = null, customProperties = {}) {
		if (pageMargin !== null) {
			this.pageMargins = pageMargin;
			this.x = pageMargin.left;
			this.availableWidth = pageSize.width - pageMargin.left - pageMargin.right;
		}

		let page = { items: [], pageSize: pageSize, pageMargins: this.pageMargins, customProperties: customProperties };
		this.pages.push(page);
		this.backgroundLength.push(0);
		this.page = this.pages.length - 1;
		this.initializePage();

		this.emit('pageAdded', page);

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
