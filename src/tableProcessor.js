'use strict';

var ColumnCalculator = require('./columnCalculator');
var isFunction = require('./helpers').isFunction;
var isNumber = require('./helpers').isNumber;
var isPositiveInteger = require('./helpers').isPositiveInteger;

function TableProcessor(tableNode) {
	this.tableNode = tableNode;
}

TableProcessor.prototype.beginTable = function (writer) {
	var tableNode;
	var availableWidth;
	var self = this;

	tableNode = this.tableNode;
	this.offsets = tableNode._offsets;
	this.layout = tableNode._layout;

	availableWidth = writer.context().availableWidth - this.offsets.total;
	ColumnCalculator.buildColumnWidths(tableNode.table.widths, availableWidth, this.offsets.total, tableNode);

	this.tableWidth = tableNode._offsets.total + getTableInnerContentWidth();
	this.rowSpanData = prepareRowSpanData();
	this.cleanUpRepeatables = false;

	// headersRows and rowsWithoutPageBreak (headerRows + keepWithHeaderRows)
	this.headerRows = 0;
	this.rowsWithoutPageBreak = 0;

	var headerRows = tableNode.table.headerRows;

	if (isPositiveInteger(headerRows)) {
		this.headerRows = headerRows;

		if (this.headerRows > tableNode.table.body.length) {
			throw new Error(`Too few rows in the table. Property headerRows requires at least ${this.headerRows}, contains only ${tableNode.table.body.length}`);
		}

		this.rowsWithoutPageBreak = this.headerRows;

		const keepWithHeaderRows = tableNode.table.keepWithHeaderRows;

		if (isPositiveInteger(keepWithHeaderRows)) {
			this.rowsWithoutPageBreak += keepWithHeaderRows;
		}
	}

	this.dontBreakRows = tableNode.table.dontBreakRows || false;

	if (this.rowsWithoutPageBreak || this.dontBreakRows) {
		writer.beginUnbreakableBlock();
		// Draw the top border of the table
		this.drawHorizontalLine(0, writer);
		if (this.rowsWithoutPageBreak && this.dontBreakRows) {
			// We just increase the value of transactionLevel
			writer.beginUnbreakableBlock();
		}
	}

	// update the border properties of all cells before drawing any lines
	prepareCellBorders(this.tableNode.table.body);

	function getTableInnerContentWidth() {
		var width = 0;

		tableNode.table.widths.forEach(function (w) {
			width += w._calcWidth;
		});

		return width;
	}

	function prepareRowSpanData() {
		var rsd = [];
		var x = 0;
		var lastWidth = 0;

		rsd.push({ left: 0, rowSpan: 0 });

		for (var i = 0, l = self.tableNode.table.body[0].length; i < l; i++) {
			var paddings = self.layout.paddingLeft(i, self.tableNode) + self.layout.paddingRight(i, self.tableNode);
			var lBorder = self.layout.vLineWidth(i, self.tableNode);
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
		for (var rowIndex = 0; rowIndex < body.length; rowIndex++) {
			var row = body[rowIndex];

			for (var colIndex = 0; colIndex < row.length; colIndex++) {
				var cell = row[colIndex];

				if (cell.border) {
					var rowSpan = cell.rowSpan || 1;
					var colSpan = cell.colSpan || 1;

					for (var rowOffset = 0; rowOffset < rowSpan; rowOffset++) {
						// set left border
						if (cell.border[0] !== undefined && rowOffset > 0) {
							setBorder(rowIndex + rowOffset, colIndex, 0, cell.border[0]);
						}

						// set right border
						if (cell.border[2] !== undefined) {
							setBorder(rowIndex + rowOffset, colIndex + colSpan - 1, 2, cell.border[2]);
						}
					}

					for (var colOffset = 0; colOffset < colSpan; colOffset++) {
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
			var cell = body[rowIndex][colIndex];
			cell.border = cell.border || {};
			cell.border[borderIndex] = borderValue;
		}
	}
};

TableProcessor.prototype.onRowBreak = function (rowIndex, writer) {
	var self = this;
	return function () {
		var offset = self.rowPaddingTop + (!self.headerRows ? self.topLineWidth : 0);
		writer.context().availableHeight -= self.reservedAtBottom;
		writer.context().moveDown(offset);
	};
};

TableProcessor.prototype.beginRow = function (rowIndex, writer) {
	this.topLineWidth = this.layout.hLineWidth(rowIndex, this.tableNode);
	this.rowPaddingTop = this.layout.paddingTop(rowIndex, this.tableNode);
	this.bottomLineWidth = this.layout.hLineWidth(rowIndex + 1, this.tableNode);
	this.rowPaddingBottom = this.layout.paddingBottom(rowIndex, this.tableNode);

	this.rowCallback = this.onRowBreak(rowIndex, writer);
	writer.tracker.startTracking('pageChanged', this.rowCallback);
	if (rowIndex == 0 && !this.dontBreakRows && !this.rowsWithoutPageBreak) {
		// We store the 'y' to draw later and if necessary the top border of the table
		this._tableTopBorderY = writer.context().y;
		writer.context().moveDown(this.topLineWidth);
	}
	if (this.dontBreakRows && rowIndex > 0) {
		writer.beginUnbreakableBlock();
	}
	this.rowTopY = writer.context().y;
	this.reservedAtBottom = this.bottomLineWidth + this.rowPaddingBottom;

	writer.context().availableHeight -= this.reservedAtBottom;

	writer.context().moveDown(this.rowPaddingTop);
};

TableProcessor.prototype.drawHorizontalLine = function (lineIndex, writer, overrideY, moveDown = true, forcePage) {
	var lineWidth = this.layout.hLineWidth(lineIndex, this.tableNode);
	if (lineWidth) {
		var style = this.layout.hLineStyle(lineIndex, this.tableNode);
		var dash;
		if (style && style.dash) {
			dash = style.dash;
		}

		var offset = lineWidth / 2;
		var currentLine = null;
		var body = this.tableNode.table.body;
		var cellAbove;
		var currentCell;
		var rowCellAbove;

		for (var i = 0, l = this.rowSpanData.length; i < l; i++) {
			var data = this.rowSpanData[i];
			var shouldDrawLine = !data.rowSpan;
			var borderColor = null;

			// draw only if the current cell requires a top border or the cell in the
			// row above requires a bottom border
			if (shouldDrawLine && i < l - 1) {
				var topBorder = false, bottomBorder = false, rowBottomBorder = false;

				// the cell in the row above
				if (lineIndex > 0) {
					cellAbove = body[lineIndex - 1][i];
					bottomBorder = cellAbove.border ? cellAbove.border[3] : this.layout.defaultBorder;
					if (bottomBorder && cellAbove.borderColor) {
						borderColor = cellAbove.borderColor[3];
					}
				}

				// the current cell
				if (lineIndex < body.length) {
					currentCell = body[lineIndex][i];
					topBorder = currentCell.border ? currentCell.border[1] : this.layout.defaultBorder;
					if (topBorder && borderColor == null && currentCell.borderColor) {
						borderColor = currentCell.borderColor[1];
					}
				}

				shouldDrawLine = topBorder || bottomBorder;
			}

			if (cellAbove && cellAbove._rowSpanCurrentOffset) {
				rowCellAbove = body[lineIndex - 1 - cellAbove._rowSpanCurrentOffset][i];
				rowBottomBorder = rowCellAbove && rowCellAbove.border ? rowCellAbove.border[3] : this.layout.defaultBorder;
				if (rowBottomBorder && rowCellAbove && rowCellAbove.borderColor) {
					borderColor = rowCellAbove.borderColor[3];
				}
			}

			if (borderColor == null) {
				borderColor = isFunction(this.layout.hLineColor) ? this.layout.hLineColor(lineIndex, this.tableNode, i) : this.layout.hLineColor;
			}

			if (!currentLine && shouldDrawLine) {
				currentLine = { left: data.left, width: 0 };
			}

			if (shouldDrawLine) {
				var colSpanIndex = 0;
				if (rowCellAbove && rowCellAbove.colSpan && rowBottomBorder) {
					while (rowCellAbove.colSpan > colSpanIndex) {
						currentLine.width += (this.rowSpanData[i + colSpanIndex++].width || 0);
					}
					i += colSpanIndex - 1;
				} else if (cellAbove && cellAbove.colSpan && bottomBorder) {
					while (cellAbove.colSpan > colSpanIndex) {
						currentLine.width += (this.rowSpanData[i + colSpanIndex++].width || 0);
					}
					i += colSpanIndex - 1;
				} else if (currentCell && currentCell.colSpan && topBorder) {
					while (currentCell.colSpan > colSpanIndex) {
						currentLine.width += (this.rowSpanData[i + colSpanIndex++].width || 0);
					}
					i += colSpanIndex - 1;
				} else {
					currentLine.width += (this.rowSpanData[i].width || 0);
				}
			}

			var y = (overrideY || 0) + offset;


			if (shouldDrawLine) {
				if (currentLine && currentLine.width) {
					writer.addVector({
						type: 'line',
						x1: currentLine.left,
						x2: currentLine.left + currentLine.width,
						y1: y,
						y2: y,
						lineWidth: lineWidth,
						dash: dash,
						lineColor: borderColor
					}, false, isNumber(overrideY), null, forcePage);
					currentLine = null;
					borderColor = null;
					cellAbove = null;
					currentCell = null;
					rowCellAbove = null;
				}
			}
		}

		if (moveDown) {
			writer.context().moveDown(lineWidth);
		}
	}
};

TableProcessor.prototype.drawVerticalLine = function (x, y0, y1, vLineColIndex, writer, vLineRowIndex, beforeVLineColIndex) {
	var width = this.layout.vLineWidth(vLineColIndex, this.tableNode);
	if (width === 0) {
		return;
	}
	var style = this.layout.vLineStyle(vLineColIndex, this.tableNode);
	var dash;
	if (style && style.dash) {
		dash = style.dash;
	}

	var body = this.tableNode.table.body;
	var cellBefore;
	var currentCell;
	var borderColor;

	// the cell in the col before
	if (vLineColIndex > 0) {
		cellBefore = body[vLineRowIndex][beforeVLineColIndex];
		if (cellBefore && cellBefore.borderColor) {
			if (cellBefore.border ? cellBefore.border[2] : this.layout.defaultBorder) {
				borderColor = cellBefore.borderColor[2];
			}
		}
	}

	// the current cell
	if (borderColor == null && vLineColIndex < body.length) {
		currentCell = body[vLineRowIndex][vLineColIndex];
		if (currentCell && currentCell.borderColor) {
			if (currentCell.border ? currentCell.border[0] : this.layout.defaultBorder) {
				borderColor = currentCell.borderColor[0];
			}
		}
	}

	if (borderColor == null && cellBefore && cellBefore._rowSpanCurrentOffset) {
		var rowCellBeforeAbove = body[vLineRowIndex - cellBefore._rowSpanCurrentOffset][beforeVLineColIndex];
		if (rowCellBeforeAbove.borderColor) {
			if (rowCellBeforeAbove.border ? rowCellBeforeAbove.border[2] : this.layout.defaultBorder) {
				borderColor = rowCellBeforeAbove.borderColor[2];
			}
		}
	}

	if (borderColor == null && currentCell && currentCell._rowSpanCurrentOffset) {
		var rowCurrentCellAbove = body[vLineRowIndex - currentCell._rowSpanCurrentOffset][vLineColIndex];
		if (rowCurrentCellAbove.borderColor) {
			if (rowCurrentCellAbove.border ? rowCurrentCellAbove.border[2] : this.layout.defaultBorder) {
				borderColor = rowCurrentCellAbove.borderColor[2];
			}
		}
	}

	if (borderColor == null) {
		borderColor = isFunction(this.layout.vLineColor) ? this.layout.vLineColor(vLineColIndex, this.tableNode, vLineRowIndex) : this.layout.vLineColor;
	}
	writer.addVector({
		type: 'line',
		x1: x + width / 2,
		x2: x + width / 2,
		y1: y0,
		y2: y1,
		lineWidth: width,
		dash: dash,
		lineColor: borderColor
	}, false, true);
	cellBefore = null;
	currentCell = null;
	borderColor = null;
};

TableProcessor.prototype.endTable = function (writer) {
	if (this.cleanUpRepeatables) {
		writer.popFromRepeatables();
	}
};

TableProcessor.prototype.endRow = function (rowIndex, writer, pageBreaks) {
	var l, i;
	var self = this;
	writer.tracker.stopTracking('pageChanged', this.rowCallback);
	writer.context().moveDown(this.layout.paddingBottom(rowIndex, this.tableNode));
	writer.context().availableHeight += this.reservedAtBottom;

	var endingPage = writer.context().page;
	var endingY = writer.context().y;

	var xs = getLineXs();

	var ys = [];

	var hasBreaks = pageBreaks && pageBreaks.length > 0;
	var body = this.tableNode.table.body;

	ys.push({
		y0: this.rowTopY,
		page: hasBreaks ? pageBreaks[0].prevPage : endingPage
	});

	if (hasBreaks) {
		for (i = 0, l = pageBreaks.length; i < l; i++) {
			var pageBreak = pageBreaks[i];
			ys[ys.length - 1].y1 = pageBreak.prevY;

			ys.push({ y0: pageBreak.y, page: pageBreak.prevPage + 1 });
		}
	}

	ys[ys.length - 1].y1 = endingY;

	var skipOrphanePadding = (ys[0].y1 - ys[0].y0 === this.rowPaddingTop);
	if (rowIndex === 0 && !skipOrphanePadding && !this.rowsWithoutPageBreak && !this.dontBreakRows) {
		// Draw the top border of the table
		var pageTableStartedAt = null;
		if (pageBreaks && pageBreaks.length > 0) {
			// Get the page where table started at
			pageTableStartedAt = pageBreaks[0].prevPage;
		}
		this.drawHorizontalLine(0, writer, this._tableTopBorderY, false, pageTableStartedAt);
	}
	for (var yi = (skipOrphanePadding ? 1 : 0), yl = ys.length; yi < yl; yi++) {
		var willBreak = yi < ys.length - 1;
		var rowBreakWithoutHeader = (yi > 0 && !this.headerRows);
		var hzLineOffset = rowBreakWithoutHeader ? 0 : this.topLineWidth;
		var y1 = ys[yi].y0;
		var y2 = ys[yi].y1;

		if (willBreak) {
			y2 = y2 + this.rowPaddingBottom;
		}

		if (writer.context().page != ys[yi].page) {
			writer.context().page = ys[yi].page;

			//TODO: buggy, availableHeight should be updated on every pageChanged event
			// TableProcessor should be pageChanged listener, instead of processRow
			this.reservedAtBottom = 0;
		}

		// Draw horizontal lines before the vertical lines so they are not overridden
		if (willBreak && this.layout.hLineWhenBroken !== false) {
			this.drawHorizontalLine(rowIndex + 1, writer, y2);
		}
		if (rowBreakWithoutHeader && this.layout.hLineWhenBroken !== false) {
			this.drawHorizontalLine(rowIndex, writer, y1);
		}

		for (i = 0, l = xs.length; i < l; i++) {
			var leftCellBorder = false;
			var rightCellBorder = false;
			var colIndex = xs[i].index;

			// current cell
			if (colIndex < body[rowIndex].length) {
				var cell = body[rowIndex][colIndex];
				leftCellBorder = cell.border ? cell.border[0] : this.layout.defaultBorder;
				rightCellBorder = cell.border ? cell.border[2] : this.layout.defaultBorder;
			}

			// before cell
			if (colIndex > 0 && !leftCellBorder) {
				var cell = body[rowIndex][colIndex - 1];
				leftCellBorder = cell.border ? cell.border[2] : this.layout.defaultBorder;
			}

			// after cell
			if (colIndex + 1 < body[rowIndex].length && !rightCellBorder) {
				var cell = body[rowIndex][colIndex + 1];
				rightCellBorder = cell.border ? cell.border[0] : this.layout.defaultBorder;
			}

			if (leftCellBorder) {
				this.drawVerticalLine(xs[i].x, y1 - hzLineOffset, y2 + this.bottomLineWidth, xs[i].index, writer, rowIndex, xs[i - 1] ? xs[i - 1].index : null);
			}

			if (i < l - 1) {
				var fillColor = body[rowIndex][colIndex].fillColor;
				var fillOpacity = body[rowIndex][colIndex].fillOpacity;
				if (!fillColor) {
					fillColor = isFunction(this.layout.fillColor) ? this.layout.fillColor(rowIndex, this.tableNode, colIndex) : this.layout.fillColor;
				}
				if (!isNumber(fillOpacity)) {
					fillOpacity = isFunction(this.layout.fillOpacity) ? this.layout.fillOpacity(rowIndex, this.tableNode, colIndex) : this.layout.fillOpacity;
				}
				var overlayPattern = body[rowIndex][colIndex].overlayPattern;
				var overlayOpacity = body[rowIndex][colIndex].overlayOpacity;
				if (fillColor || overlayPattern) {
					var widthLeftBorder = leftCellBorder ? this.layout.vLineWidth(colIndex, this.tableNode) : 0;
					var widthRightBorder;
					if ((colIndex === 0 || colIndex + 1 == body[rowIndex].length) && !rightCellBorder) {
						widthRightBorder = this.layout.vLineWidth(colIndex + 1, this.tableNode);
					} else if (rightCellBorder) {
						widthRightBorder = this.layout.vLineWidth(colIndex + 1, this.tableNode) / 2;
					} else {
						widthRightBorder = 0;
					}

					var x1f = this.dontBreakRows ? xs[i].x + widthLeftBorder : xs[i].x + (widthLeftBorder / 2);
					var y1f = this.dontBreakRows ? y1 : y1 - (hzLineOffset / 2);
					var x2f = xs[i + 1].x + widthRightBorder;
					var y2f = this.dontBreakRows ? y2 + this.bottomLineWidth : y2 + (this.bottomLineWidth / 2);
					var bgWidth = x2f - x1f;
					var bgHeight = y2f - y1f;
					if (fillColor) {
						writer.addVector({
							type: 'rect',
							x: x1f,
							y: y1f,
							w: bgWidth,
							h: bgHeight,
							lineWidth: 0,
							color: fillColor,
							fillOpacity: fillOpacity,
							// mark if we are in an unbreakable block
							_isFillColorFromUnbreakable: !!writer.transactionLevel
						}, false, true, writer.context().backgroundLength[writer.context().page]);
					}

					if (overlayPattern) {
						writer.addVector({
							type: 'rect',
							x: x1f,
							y: y1f,
							w: bgWidth,
							h: bgHeight,
							lineWidth: 0,
							color: overlayPattern,
							fillOpacity: overlayOpacity
						}, false, true);
					}
				}
			}
		}
	}

	writer.context().page = endingPage;
	writer.context().y = endingY;

	var row = this.tableNode.table.body[rowIndex];
	for (i = 0, l = row.length; i < l; i++) {
		if (row[i].rowSpan) {
			this.rowSpanData[i].rowSpan = row[i].rowSpan;

			// fix colSpans
			if (row[i].colSpan && row[i].colSpan > 1) {
				for (var j = 1; j < row[i].rowSpan; j++) {
					this.tableNode.table.body[rowIndex + j][i]._colSpan = row[i].colSpan;
				}
			}
			// fix rowSpans
			if (row[i].rowSpan && row[i].rowSpan > 1) {
				for (var j = 1; j < row[i].rowSpan; j++) {
					this.tableNode.table.body[rowIndex + j][i]._rowSpanCurrentOffset = j;
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
			function () {
				if (rowIndex > 0 && !self.headerRows && self.layout.hLineWhenBroken !== false) {
					// Draw the top border of the row after a page break
					self.drawHorizontalLine(rowIndex, writer);
				}
			},
			function () {
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
		var result = [];
		var cols = 0;

		for (var i = 0, l = self.tableNode.table.body[rowIndex].length; i < l; i++) {
			if (!cols) {
				result.push({ x: self.rowSpanData[i].left, index: i });

				var item = self.tableNode.table.body[rowIndex][i];
				cols = (item._colSpan || item.colSpan || 0);
			}
			if (cols > 0) {
				cols--;
			}
		}

		result.push({ x: self.rowSpanData[self.rowSpanData.length - 1].left, index: self.rowSpanData.length - 1 });

		return result;
	}
};

module.exports = TableProcessor;
