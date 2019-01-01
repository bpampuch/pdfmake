import ColumnCalculator from './columnCalculator';
import { isFunction } from './helpers/variableType';

class TableProcessor {
	constructor(tableNode) {
		this.tableNode = tableNode;
	}

	beginTable(writer) {
		let tableNode;
		let availableWidth;
		var self = this;

		tableNode = this.tableNode;
		this.offsets = tableNode._offsets;
		this.layout = tableNode._layout;

		availableWidth = writer.context().availableWidth - this.offsets.total;
		ColumnCalculator.buildColumnWidths(tableNode.table.widths, availableWidth);

		this.tableWidth = tableNode._offsets.total + getTableInnerContentWidth();
		this.rowSpanData = prepareRowSpanData();
		this.cleanUpRepeatables = false;

		this.headerRows = tableNode.table.headerRows || 0;
		this.rowsWithoutPageBreak = this.headerRows + (tableNode.table.keepWithHeaderRows || 0);
		this.dontBreakRows = tableNode.table.dontBreakRows || false;

		if (this.rowsWithoutPageBreak) {
			writer.beginUnbreakableBlock();
		}

		// update the border properties of all cells before drawing any lines
		prepareCellBorders(this.tableNode.table.body);

		this.drawHorizontalLine(0, writer);

		function getTableInnerContentWidth() {
			let width = 0;

			tableNode.table.widths.forEach(w => {
				width += w._calcWidth;
			});

			return width;
		}

		function prepareRowSpanData() {
			let rsd = [];
			let x = 0;
			let lastWidth = 0;

			rsd.push({ left: 0, rowSpan: 0 });

			for (let i = 0, l = self.tableNode.table.body[0].length; i < l; i++) {
				let paddings = self.layout.paddingLeft(i, self.tableNode) + self.layout.paddingRight(i, self.tableNode);
				let lBorder = self.layout.vLineWidth(i, self.tableNode);
				lastWidth = paddings + lBorder + self.tableNode.table.widths[i]._calcWidth;
				rsd[rsd.length - 1].width = lastWidth;
				x += lastWidth;
				rsd.push({ left: x, rowSpan: 0, width: 0 });
			}

			return rsd;
		}

		// Iterate through all cells. If the current cell is the start of a
		// rowSpan/colSpan, update the border property of the cells on its
		// bottom/right accordingly. This is needed since each iteration of the
		// line-drawing loops draws lines for a single cell, not for an entire
		// rowSpan/colSpan.
		function prepareCellBorders(body) {
			for (let rowIndex = 0; rowIndex < body.length; rowIndex++) {
				let row = body[rowIndex];

				for (let colIndex = 0; colIndex < row.length; colIndex++) {
					let cell = row[colIndex];

					if (cell.border) {
						let rowSpan = cell.rowSpan || 1;
						let colSpan = cell.colSpan || 1;

						for (let rowOffset = 0; rowOffset < rowSpan; rowOffset++) {
							// set left border
							if (cell.border[0] !== undefined && rowOffset > 0) {
								setBorder(rowIndex + rowOffset, colIndex, 0, cell.border[0]);
							}

							// set right border
							if (cell.border[2] !== undefined) {
								setBorder(rowIndex + rowOffset, colIndex + colSpan - 1, 2, cell.border[2]);
							}
						}

						for (let colOffset = 0; colOffset < colSpan; colOffset++) {
							// set top border
							if (cell.border[1] !== undefined && colOffset > 0) {
								setBorder(rowIndex, colIndex + colOffset, 1, cell.border[1]);
							}

							// set bottom border
							if (cell.border[3] !== undefined) {
								setBorder(rowIndex + rowSpan - 1, colIndex + colOffset, 3, cell.border[3]);
							}
						}
					}
				}
			}

			// helper function to set the border for a given cell
			function setBorder(rowIndex, colIndex, borderIndex, borderValue) {
				let cell = body[rowIndex][colIndex];
				cell.border = cell.border || {};
				cell.border[borderIndex] = borderValue;
			}
		}
	}

	onRowBreak(rowIndex, writer) {
		return () => {
			let offset = this.rowPaddingTop + (!this.headerRows ? this.topLineWidth : 0);
			writer.context().availableHeight -= this.reservedAtBottom;
			writer.context().moveDown(offset);
		};
	}

	beginRow(rowIndex, writer) {
		this.topLineWidth = this.layout.hLineWidth(rowIndex, this.tableNode);
		this.rowPaddingTop = this.layout.paddingTop(rowIndex, this.tableNode);
		this.bottomLineWidth = this.layout.hLineWidth(rowIndex + 1, this.tableNode);
		this.rowPaddingBottom = this.layout.paddingBottom(rowIndex, this.tableNode);

		this.rowCallback = this.onRowBreak(rowIndex, writer);
		writer.tracker.startTracking('pageChanged', this.rowCallback);
		if (this.dontBreakRows) {
			writer.beginUnbreakableBlock();
		}
		this.rowTopY = writer.context().y;
		this.reservedAtBottom = this.bottomLineWidth + this.rowPaddingBottom;

		writer.context().availableHeight -= this.reservedAtBottom;

		writer.context().moveDown(this.rowPaddingTop);
	}

	drawHorizontalLine(lineIndex, writer, overrideY) {
		let lineWidth = this.layout.hLineWidth(lineIndex, this.tableNode);
		if (lineWidth) {
			let style = this.layout.hLineStyle(lineIndex, this.tableNode);
			let dash;
			if (style && style.dash) {
				dash = style.dash;
			}

			let offset = lineWidth / 2;
			let currentLine = null;
			let body = this.tableNode.table.body;

			for (let i = 0, l = this.rowSpanData.length; i < l; i++) {
				let data = this.rowSpanData[i];
				let shouldDrawLine = !data.rowSpan;

				// draw only if the current cell requires a top border or the cell in the
				// row above requires a bottom border
				if (shouldDrawLine && i < l - 1) {
					let topBorder = false;
					let bottomBorder = false;

					// the current cell
					if (lineIndex < body.length) {
						let cell = body[lineIndex][i];
						topBorder = cell.border ? cell.border[1] : this.layout.defaultBorder;
					}

					// the cell in the row above
					if (lineIndex > 0) {
						let cellAbove = body[lineIndex - 1][i];
						bottomBorder = cellAbove.border ? cellAbove.border[3] : this.layout.defaultBorder;
					}

					shouldDrawLine = topBorder || bottomBorder;
				}

				if (!currentLine && shouldDrawLine) {
					currentLine = { left: data.left, width: 0 };
				}

				if (shouldDrawLine) {
					currentLine.width += (data.width || 0);
				}

				let y = (overrideY || 0) + offset;

				if (!shouldDrawLine || i === l - 1) {
					if (currentLine && currentLine.width) {
						writer.addVector({
							type: 'line',
							x1: currentLine.left,
							x2: currentLine.left + currentLine.width,
							y1: y,
							y2: y,
							lineWidth: lineWidth,
							dash: dash,
							lineColor: isFunction(this.layout.hLineColor) ? this.layout.hLineColor(lineIndex, this.tableNode) : this.layout.hLineColor
						}, false, overrideY);
						currentLine = null;
					}
				}
			}

			writer.context().moveDown(lineWidth);
		}
	}

	drawVerticalLine(x, y0, y1, vLineIndex, writer) {
		let width = this.layout.vLineWidth(vLineIndex, this.tableNode);
		if (width === 0) {
			return;
		}
		let style = this.layout.vLineStyle(vLineIndex, this.tableNode);
		let dash;
		if (style && style.dash) {
			dash = style.dash;
		}
		writer.addVector({
			type: 'line',
			x1: x + width / 2,
			x2: x + width / 2,
			y1: y0,
			y2: y1,
			lineWidth: width,
			dash: dash,
			lineColor: isFunction(this.layout.vLineColor) ? this.layout.vLineColor(vLineIndex, this.tableNode) : this.layout.vLineColor
		}, false, true);
	}

	endTable(writer) {
		if (this.cleanUpRepeatables) {
			writer.popFromRepeatables();
		}
	}

	endRow(rowIndex, writer, pageBreaks) {
		var self = this;
		writer.tracker.stopTracking('pageChanged', this.rowCallback);
		writer.context().moveDown(this.layout.paddingBottom(rowIndex, this.tableNode));
		writer.context().availableHeight += this.reservedAtBottom;

		let endingPage = writer.context().page;
		let endingY = writer.context().y;

		let xs = getLineXs();

		let ys = [];

		let hasBreaks = pageBreaks && pageBreaks.length > 0;
		let body = this.tableNode.table.body;

		ys.push({
			y0: this.rowTopY,
			page: hasBreaks ? pageBreaks[0].prevPage : endingPage
		});

		if (hasBreaks) {
			for (let i = 0, l = pageBreaks.length; i < l; i++) {
				let pageBreak = pageBreaks[i];
				ys[ys.length - 1].y1 = pageBreak.prevY;

				ys.push({ y0: pageBreak.y, page: pageBreak.prevPage + 1 });
			}
		}

		ys[ys.length - 1].y1 = endingY;

		let skipOrphanePadding = (ys[0].y1 - ys[0].y0 === this.rowPaddingTop);
		for (let yi = (skipOrphanePadding ? 1 : 0), yl = ys.length; yi < yl; yi++) {
			let willBreak = yi < ys.length - 1;
			let rowBreakWithoutHeader = (yi > 0 && !this.headerRows);
			let hzLineOffset = rowBreakWithoutHeader ? 0 : this.topLineWidth;
			let y1 = ys[yi].y0;
			let y2 = ys[yi].y1;

			if (willBreak) {
				y2 = y2 + this.rowPaddingBottom;
			}

			if (writer.context().page != ys[yi].page) {
				writer.context().page = ys[yi].page;

				//TODO: buggy, availableHeight should be updated on every pageChanged event
				// TableProcessor should be pageChanged listener, instead of processRow
				this.reservedAtBottom = 0;
			}

			for (let i = 0, l = xs.length; i < l; i++) {
				let leftBorder = false;
				let rightBorder = false;
				let colIndex = xs[i].index;

				// the current cell
				if (colIndex < body[rowIndex].length) {
					let cell = body[rowIndex][colIndex];
					leftBorder = cell.border ? cell.border[0] : this.layout.defaultBorder;
				}

				// the cell from before column
				if (colIndex > 0) {
					let cell = body[rowIndex][colIndex - 1];
					rightBorder = cell.border ? cell.border[2] : this.layout.defaultBorder;
				}

				if (leftBorder || rightBorder) {
					this.drawVerticalLine(xs[i].x, y1 - hzLineOffset, y2 + this.bottomLineWidth, xs[i].index, writer);
				}

				if (i < l - 1) {
					let fillColor = body[rowIndex][colIndex].fillColor;
					if (!fillColor) {
						fillColor = isFunction(this.layout.fillColor) ? this.layout.fillColor(rowIndex, this.tableNode, colIndex) : this.layout.fillColor;
					}
					if (fillColor) {
						let wBorder = (leftBorder || rightBorder) ? this.layout.vLineWidth(colIndex, this.tableNode) : 0;
						let xf = xs[i].x + wBorder;
						let yf = this.dontBreakRows ? y1 : y1 - hzLineOffset;
						writer.addVector({
							type: 'rect',
							x: xf,
							y: yf,
							w: xs[i + 1].x - xf,
							h: y2 + this.bottomLineWidth - yf,
							lineWidth: 0,
							color: fillColor
						}, false, true, writer.context().backgroundLength[writer.context().page]);
					}
				}
			}

			if (willBreak && this.layout.hLineWhenBroken !== false) {
				this.drawHorizontalLine(rowIndex + 1, writer, y2);
			}
			if (rowBreakWithoutHeader && this.layout.hLineWhenBroken !== false) {
				this.drawHorizontalLine(rowIndex, writer, y1);
			}
		}

		writer.context().page = endingPage;
		writer.context().y = endingY;

		let row = this.tableNode.table.body[rowIndex];
		for (let i = 0, l = row.length; i < l; i++) {
			if (row[i].rowSpan) {
				this.rowSpanData[i].rowSpan = row[i].rowSpan;

				// fix colSpans
				if (row[i].colSpan && row[i].colSpan > 1) {
					for (let j = 1; j < row[i].rowSpan; j++) {
						this.tableNode.table.body[rowIndex + j][i]._colSpan = row[i].colSpan;
					}
				}
			}

			if (this.rowSpanData[i].rowSpan > 0) {
				this.rowSpanData[i].rowSpan--;
			}
		}

		this.drawHorizontalLine(rowIndex + 1, writer);

		if (this.headerRows && rowIndex === this.headerRows - 1) {
			this.headerRepeatable = writer.currentBlockToRepeatable();
		}

		if (this.dontBreakRows) {
			writer.tracker.auto('pageChanged',
				() => {
					if (!self.headerRows && self.layout.hLineWhenBroken !== false) {
						self.drawHorizontalLine(rowIndex, writer);
					}
				},
				() => {
					writer.commitUnbreakableBlock();
				}
			);
		}

		if (this.headerRepeatable && (rowIndex === (this.rowsWithoutPageBreak - 1) || rowIndex === this.tableNode.table.body.length - 1)) {
			writer.commitUnbreakableBlock();
			writer.pushToRepeatables(this.headerRepeatable);
			this.cleanUpRepeatables = true;
			this.headerRepeatable = null;
		}

		function getLineXs() {
			let result = [];
			let cols = 0;

			for (let i = 0, l = self.tableNode.table.body[rowIndex].length; i < l; i++) {
				if (!cols) {
					result.push({ x: self.rowSpanData[i].left, index: i });

					let item = self.tableNode.table.body[rowIndex][i];
					cols = (item._colSpan || item.colSpan || 0);
				}
				if (cols > 0) {
					cols--;
				}
			}

			result.push({ x: self.rowSpanData[self.rowSpanData.length - 1].left, index: self.rowSpanData.length - 1 });

			return result;
		}
	}
}

export default TableProcessor;
