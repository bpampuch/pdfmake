import {isString} from './helpers';

/**
 * A store for current x, y positions and available width/height.
 * It facilitates column divisions and vertical sync
 */
class DocumentContext {
	constructor(pageSize, pageMargins) {

		this.endingCell = null;

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



}

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
