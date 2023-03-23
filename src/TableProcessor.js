import ColumnCalculator from "./columnCalculator";
import { isNumber } from "./helpers/variableType";
// begin - Vertical alignment
import { offsetVector } from "./helpers/tools";
// end - Vertical alignment

class TableProcessor {
	constructor(tableNode) {
		this.tableNode = tableNode;
	}

	beginTable(writer) {
		// begin - Vertical alignment
		this.tableNode.table.__rowsHeight = [];
		// end - Vertical alignment
		const getTableInnerContentWidth = () => {
			let width = 0;

			tableNode.table.widths.forEach((w) => {
				width += w._calcWidth;
			});

			return width;
		};

		const prepareRowSpanData = () => {
			let rsd = [];
			let x = 0;
			let lastWidth = 0;

			rsd.push({ left: 0, rowSpan: 0 });

			for (let i = 0, l = this.tableNode.table.body[0].length; i < l; i++) {
				let paddings =
					this.layout.paddingLeft(i, this.tableNode) +
					this.layout.paddingRight(i, this.tableNode);
				let lBorder = this.layout.vLineWidth(i, this.tableNode);
				lastWidth =
					paddings + lBorder + this.tableNode.table.widths[i]._calcWidth;
				rsd[rsd.length - 1].width = lastWidth;
				x += lastWidth;
				rsd.push({ left: x, rowSpan: 0, width: 0 });
			}

			return rsd;
		};

		// Iterate through all cells. If the current cell is the start of a
		// rowSpan/colSpan, update the border property of the cells on its
		// bottom/right accordingly. This is needed since each iteration of the
		// line-drawing loops draws lines for a single cell, not for an entire
		// rowSpan/colSpan.
		const prepareCellBorders = (body) => {
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
								setBorder(
									rowIndex + rowOffset,
									colIndex + colSpan - 1,
									2,
									cell.border[2]
								);
							}
						}

						for (let colOffset = 0; colOffset < colSpan; colOffset++) {
							// set top border
							if (cell.border[1] !== undefined && colOffset > 0) {
								setBorder(rowIndex, colIndex + colOffset, 1, cell.border[1]);
							}

							// set bottom border
							if (cell.border[3] !== undefined) {
								setBorder(
									rowIndex + rowSpan - 1,
									colIndex + colOffset,
									3,
									cell.border[3]
								);
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
		};

		let tableNode;
		let availableWidth;

		tableNode = this.tableNode;
		this.offsets = tableNode._offsets;
		this.layout = tableNode._layout;

		availableWidth = writer.context().availableWidth - this.offsets.total;
		ColumnCalculator.buildColumnWidths(tableNode.table.widths, availableWidth);

		this.tableWidth = tableNode._offsets.total + getTableInnerContentWidth();
		this.rowSpanData = prepareRowSpanData();
		this.cleanUpRepeatables = false;

		this.headerRows = tableNode.table.headerRows || 0;
		this.rowsWithoutPageBreak =
			this.headerRows + (tableNode.table.keepWithHeaderRows || 0);
		this.dontBreakRows = tableNode.table.dontBreakRows || false;

		if (this.rowsWithoutPageBreak) {
			writer.beginUnbreakableBlock();
		}

		// update the border properties of all cells before drawing any lines
		prepareCellBorders(this.tableNode.table.body);

		this.drawHorizontalLine(0, writer);
		// begin - Vertical alignment
		this.tableNode.__height = writer.context().y;
		// end - Vertical alignment
	}

	onRowBreak(rowIndex, writer) {
		return () => {
			let offset =
				this.rowPaddingTop + (!this.headerRows ? this.topLineWidth : 0);
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
		writer.addListener("pageChanged", this.rowCallback);
		if (this.dontBreakRows) {
			writer.beginUnbreakableBlock();
		}
		this.rowTopY = writer.context().y;
		this.reservedAtBottom = this.bottomLineWidth + this.rowPaddingBottom;

		writer.context().availableHeight -= this.reservedAtBottom;

		writer.context().moveDown(this.rowPaddingTop);
		// begin - Vertical alignment
		this.tableNode.table.__rowsHeight[rowIndex] = {
			top: this.rowTopY,
			height: 0,
		};
		// end - Vertical alignment
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
			let cellAbove;
			let currentCell;
			let rowCellAbove;

			for (let i = 0, l = this.rowSpanData.length; i < l; i++) {
				let data = this.rowSpanData[i];
				let shouldDrawLine = !data.rowSpan;
				let borderColor = null;

				// draw only if the current cell requires a top border or the cell in the
				// row above requires a bottom border
				if (shouldDrawLine && i < l - 1) {
					var topBorder = false,
						bottomBorder = false,
						rowBottomBorder = false;

					// the cell in the row above
					if (lineIndex > 0) {
						cellAbove = body[lineIndex - 1][i];
						bottomBorder = cellAbove.border
							? cellAbove.border[3]
							: this.layout.defaultBorder;
						if (bottomBorder && cellAbove.borderColor) {
							borderColor = cellAbove.borderColor[3];
						}
					}

					// the current cell
					if (lineIndex < body.length) {
						currentCell = body[lineIndex][i];
						topBorder = currentCell.border
							? currentCell.border[1]
							: this.layout.defaultBorder;
						if (topBorder && borderColor == null && currentCell.borderColor) {
							borderColor = currentCell.borderColor[1];
						}
					}

					shouldDrawLine = topBorder || bottomBorder;
				}

				if (cellAbove && cellAbove._rowSpanCurrentOffset) {
					rowCellAbove =
						body[lineIndex - 1 - cellAbove._rowSpanCurrentOffset][i];
					rowBottomBorder =
						rowCellAbove && rowCellAbove.border
							? rowCellAbove.border[3]
							: this.layout.defaultBorder;
					if (rowBottomBorder && rowCellAbove && rowCellAbove.borderColor) {
						borderColor = rowCellAbove.borderColor[3];
					}
				}

				if (borderColor == null) {
					borderColor =
						typeof this.layout.hLineColor === "function"
							? this.layout.hLineColor(lineIndex, this.tableNode, i)
							: this.layout.hLineColor;
				}

				if (!currentLine && shouldDrawLine) {
					currentLine = { left: data.left, width: 0 };
				}

				if (shouldDrawLine) {
					let colSpanIndex = 0;
					if (rowCellAbove && rowCellAbove.colSpan && rowBottomBorder) {
						while (rowCellAbove.colSpan > colSpanIndex) {
							currentLine.width +=
								this.rowSpanData[i + colSpanIndex++].width || 0;
						}
						i += colSpanIndex - 1;
					} else if (cellAbove && cellAbove.colSpan && bottomBorder) {
						while (cellAbove.colSpan > colSpanIndex) {
							currentLine.width +=
								this.rowSpanData[i + colSpanIndex++].width || 0;
						}
						i += colSpanIndex - 1;
					} else if (currentCell && currentCell.colSpan && topBorder) {
						while (currentCell.colSpan > colSpanIndex) {
							currentLine.width +=
								this.rowSpanData[i + colSpanIndex++].width || 0;
						}
						i += colSpanIndex - 1;
					} else {
						currentLine.width += this.rowSpanData[i].width || 0;
					}
				}

				let y = (overrideY || 0) + offset;

				if (shouldDrawLine) {
					if (currentLine && currentLine.width) {
						writer.addVector(
							{
								type: "line",
								x1: currentLine.left,
								x2: currentLine.left + currentLine.width,
								y1: y,
								y2: y,
								lineWidth: lineWidth,
								dash: dash,
								lineColor: borderColor,
								// begin - Vertical alignment
								__tableRef: this.tableNode.table,
								// end - Vertical alignment
							},
							false,
							overrideY
						);
						currentLine = null;
						borderColor = null;
						cellAbove = null;
						currentCell = null;
						rowCellAbove = null;
					}
				}
			}

			writer.context().moveDown(lineWidth);
		}
	}

	drawVerticalLine(
		x,
		y0,
		y1,
		vLineColIndex,
		writer,
		vLineRowIndex,
		beforeVLineColIndex
	) {
		let width = this.layout.vLineWidth(vLineColIndex, this.tableNode);
		if (width === 0) {
			return;
		}
		let style = this.layout.vLineStyle(vLineColIndex, this.tableNode);
		let dash;
		if (style && style.dash) {
			dash = style.dash;
		}

		let body = this.tableNode.table.body;
		let cellBefore;
		let currentCell;
		let borderColor;

		// the cell in the col before
		if (vLineColIndex > 0) {
			cellBefore = body[vLineRowIndex][beforeVLineColIndex];
			if (cellBefore && cellBefore.borderColor) {
				if (
					cellBefore.border ? cellBefore.border[2] : this.layout.defaultBorder
				) {
					borderColor = cellBefore.borderColor[2];
				}
			}
		}

		// the current cell
		if (borderColor == null && vLineColIndex < body.length) {
			currentCell = body[vLineRowIndex][vLineColIndex];
			if (currentCell && currentCell.borderColor) {
				if (
					currentCell.border ? currentCell.border[0] : this.layout.defaultBorder
				) {
					borderColor = currentCell.borderColor[0];
				}
			}
		}

		if (borderColor == null && cellBefore && cellBefore._rowSpanCurrentOffset) {
			let rowCellBeforeAbove =
				body[vLineRowIndex - cellBefore._rowSpanCurrentOffset][
					beforeVLineColIndex
				];
			if (rowCellBeforeAbove.borderColor) {
				if (
					rowCellBeforeAbove.border
						? rowCellBeforeAbove.border[2]
						: this.layout.defaultBorder
				) {
					borderColor = rowCellBeforeAbove.borderColor[2];
				}
			}
		}

		if (
			borderColor == null &&
			currentCell &&
			currentCell._rowSpanCurrentOffset
		) {
			let rowCurrentCellAbove =
				body[vLineRowIndex - currentCell._rowSpanCurrentOffset][vLineColIndex];
			if (rowCurrentCellAbove.borderColor) {
				if (
					rowCurrentCellAbove.border
						? rowCurrentCellAbove.border[2]
						: this.layout.defaultBorder
				) {
					borderColor = rowCurrentCellAbove.borderColor[2];
				}
			}
		}

		if (borderColor == null) {
			borderColor =
				typeof this.layout.vLineColor === "function"
					? this.layout.vLineColor(vLineColIndex, this.tableNode, vLineRowIndex)
					: this.layout.vLineColor;
		}

		writer.addVector(
			{
				type: "line",
				x1: x + width / 2,
				x2: x + width / 2,
				y1: y0,
				y2: y1,
				lineWidth: width,
				dash: dash,
				lineColor: borderColor,
				// begin - Vertical alignment
				__tableRef: this.tableNode.table,
				// end - Vertical alignment
			},
			false,
			true
		);
		cellBefore = null;
		currentCell = null;
		borderColor = null;
	}

	// begin - Vertical alignment
	getCellContentHeight(cell, items) {
		let contentHeight = 0;
		cell._maxHeight && (contentHeight = cell._maxHeight); // for canvas
		// for forced multiline text, text with lineHeight, ul, ol
		!cell.lineHeight &&
			cell.__contentHeight &&
			(contentHeight = cell.__contentHeight);
		!contentHeight &&
			(contentHeight = items.reduce((p, v) => {
				const item = v.item.inlines ? v.item.inlines[0] ?? null : v.item;
				const lineHeight =
					v.item.__nodeRef?.lineHeight ?? v.item._height ?? v.item.h;
				let height = item.height ?? item.h ?? 0;
				v.type === "vector" ||
					(cell.ol && !v.item.lastLineInParagraph && (height = 0)); // for ol with counter
				return p + height / (lineHeight ?? 1);
			}, 0));
		!contentHeight && cell._height && (contentHeight = cell._height); // for text, image, svg, qr
		return contentHeight;
	}

	processTableVerticalAlignment = function (writer, tableProcessor, table) {
		const getCells = (node) =>
			node.table ? node.table.body.flat().map(getCells).flat() : node;
		const getNestedTables = (node) =>
			node.table
				? [
						node,
						...node.table.body
							.flat()
							.map(getNestedTables)
							.filter(Boolean)
							.flat(),
				  ]
				: null;
		// for all rows in table
		table.body.forEach((row, rowIndex) => {
			// filter only cells with vertical alignment (middle / bottom)
			!Array.isArray(row) && row.columns && (row = row.columns);
			row
				.filter(
					(cell) =>
						cell.verticalAlign &&
						["middle", "bottom"].indexOf(cell.verticalAlign) > -1
				)
				.forEach((cell) => {
					let nestedTables;
					if (!cell._span) {
						let cellHeight = 0;
						if (cell.rowSpan && cell.rowSpan > 1) {
							const heights = table.__rowsHeight.slice(
								rowIndex,
								rowIndex + cell.rowSpan
							);
							cellHeight = heights.reduce(
								(previousValue, value) => previousValue + value.height,
								0
							);
						} else {
							cellHeight = table.__rowsHeight[rowIndex].height;
						}
						if (cellHeight) {
							const pageItems = writer._context.pages.flatMap((x) => x.items);
							let items = pageItems.filter(
								(i) => i.item.__nodeRef === cell || i.item === cell
							);
							let itemHeight = 0;
							if (items.length === 0 && cell.table) {
								itemHeight = cell.table.__rowsHeight.reduce(
									(p, v) => p + v.height,
									0
								);
								nestedTables = getNestedTables(cell);
								items = pageItems.filter(
									(i) =>
										getCells(cell).indexOf(i.item.__nodeRef) > -1 ||
										(i.item.__tableRef &&
											nestedTables.some((nt) => nt.table === i.item.__tableRef))
								);
							} else if (cell.stack) {
								const tables = cell.stack.filter((x) => x.table);
								nestedTables = getNestedTables(tables[0]);
								itemHeight =
									tables.reduce((p, v) => p + v.__height, 0) +
									cell.stack
										.flatMap((x) => x.__contentHeight)
										.filter(Boolean)
										.reduce((p, v) => p + v, 0);
								items = [
									...items,
									pageItems.filter(
										(i) =>
											getCells(tables[0]).indexOf(i.item.__nodeRef) > -1 ||
											(i.item.__tableRef &&
												nestedTables.some(
													(nt) => nt.table === i.item.__tableRef
												))
									),
								].flat();
							} else {
								itemHeight = this.getCellContentHeight(cell, items);
							}
							items.forEach((x) => {
								const offsetTop =
									cell.verticalAlign === "bottom"
										? cellHeight - itemHeight - 3
										: (cellHeight - itemHeight) / 2;
								if (x && x.item) {
									const paddingTop = tableProcessor.layout.paddingTop(
										rowIndex,
										this.tableNode
									);
									x.item.type &&
										offsetVector(
											x.item,
											0,
											Math.max(0, offsetTop) - paddingTop
										);
									!x.item.type &&
										(x.item.y += Math.max(0, offsetTop) - paddingTop);
								}
							});
						}
					}
				});
		});
	};
	// end - Vertical alignment

	endTable(writer) {
		// begin - Vertical alignment
		this.processTableVerticalAlignment(writer, this, this.tableNode.table);
		this.tableNode.__height =
			writer.context().y -
			this.tableNode.__height +
			Math.ceil(this.layout.hLineWidth(0, this.tableNode)) *
				this.tableNode.table.body.length;
		// end - Vertical alignment
		if (this.cleanUpRepeatables) {
			writer.popFromRepeatables();
		}
	}

	endRow(rowIndex, writer, pageBreaks) {
		const getLineXs = () => {
			let result = [];
			let cols = 0;

			for (
				let i = 0, l = this.tableNode.table.body[rowIndex].length;
				i < l;
				i++
			) {
				if (!cols) {
					result.push({ x: this.rowSpanData[i].left, index: i });

					let item = this.tableNode.table.body[rowIndex][i];
					cols = item._colSpan || item.colSpan || 0;
				}
				if (cols > 0) {
					cols--;
				}
			}

			result.push({
				x: this.rowSpanData[this.rowSpanData.length - 1].left,
				index: this.rowSpanData.length - 1,
			});

			return result;
		};

		writer.removeListener("pageChanged", this.rowCallback);
		writer
			.context()
			.moveDown(this.layout.paddingBottom(rowIndex, this.tableNode));
		writer.context().availableHeight += this.reservedAtBottom;

		let endingPage = writer.context().page;
		let endingY = writer.context().y;

		let xs = getLineXs();

		let ys = [];

		let hasBreaks = pageBreaks && pageBreaks.length > 0;
		let body = this.tableNode.table.body;

		ys.push({
			y0: this.rowTopY,
			page: hasBreaks ? pageBreaks[0].prevPage : endingPage,
		});

		if (hasBreaks) {
			for (let i = 0, l = pageBreaks.length; i < l; i++) {
				let pageBreak = pageBreaks[i];
				ys[ys.length - 1].y1 = pageBreak.prevY;

				ys.push({ y0: pageBreak.y, page: pageBreak.prevPage + 1 });
			}
		}

		ys[ys.length - 1].y1 = endingY;

		let skipOrphanePadding = ys[0].y1 - ys[0].y0 === this.rowPaddingTop;
		for (let yi = skipOrphanePadding ? 1 : 0, yl = ys.length; yi < yl; yi++) {
			let willBreak = yi < ys.length - 1;
			let rowBreakWithoutHeader = yi > 0 && !this.headerRows;
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
				let leftCellBorder = false;
				let rightCellBorder = false;
				let colIndex = xs[i].index;

				// current cell
				if (colIndex < body[rowIndex].length) {
					let cell = body[rowIndex][colIndex];
					leftCellBorder = cell.border
						? cell.border[0]
						: this.layout.defaultBorder;
					rightCellBorder = cell.border
						? cell.border[2]
						: this.layout.defaultBorder;
				}

				// before cell
				if (colIndex > 0 && !leftCellBorder) {
					let cell = body[rowIndex][colIndex - 1];
					leftCellBorder = cell.border
						? cell.border[2]
						: this.layout.defaultBorder;
				}

				// after cell
				if (colIndex + 1 < body[rowIndex].length && !rightCellBorder) {
					let cell = body[rowIndex][colIndex + 1];
					rightCellBorder = cell.border
						? cell.border[0]
						: this.layout.defaultBorder;
				}

				if (leftCellBorder) {
					this.drawVerticalLine(
						xs[i].x,
						y1 - hzLineOffset,
						y2 + this.bottomLineWidth,
						xs[i].index,
						writer,
						rowIndex,
						xs[i - 1] ? xs[i - 1].index : null
					);
				}

				if (i < l - 1) {
					let fillColor = body[rowIndex][colIndex].fillColor;
					let fillOpacity = body[rowIndex][colIndex].fillOpacity;
					if (!fillColor) {
						fillColor =
							typeof this.layout.fillColor === "function"
								? this.layout.fillColor(rowIndex, this.tableNode, colIndex)
								: this.layout.fillColor;
					}
					if (!isNumber(fillOpacity)) {
						fillOpacity =
							typeof this.layout.fillOpacity === "function"
								? this.layout.fillOpacity(rowIndex, this.tableNode, colIndex)
								: this.layout.fillOpacity;
					}
					var overlayPattern = body[rowIndex][colIndex].overlayPattern;
					var overlayOpacity = body[rowIndex][colIndex].overlayOpacity;
					if (fillColor || overlayPattern) {
						let widthLeftBorder = leftCellBorder
							? this.layout.vLineWidth(colIndex, this.tableNode)
							: 0;
						let widthRightBorder;
						if (
							(colIndex === 0 || colIndex + 1 == body[rowIndex].length) &&
							!rightCellBorder
						) {
							widthRightBorder = this.layout.vLineWidth(
								colIndex + 1,
								this.tableNode
							);
						} else if (rightCellBorder) {
							widthRightBorder =
								this.layout.vLineWidth(colIndex + 1, this.tableNode) / 2;
						} else {
							widthRightBorder = 0;
						}

						let x1f = this.dontBreakRows
							? xs[i].x + widthLeftBorder
							: xs[i].x + widthLeftBorder / 2;
						let y1f = this.dontBreakRows ? y1 : y1 - hzLineOffset / 2;
						let x2f = xs[i + 1].x + widthRightBorder;
						let y2f = this.dontBreakRows
							? y2 + this.bottomLineWidth
							: y2 + this.bottomLineWidth / 2;
						var bgWidth = x2f - x1f;
						var bgHeight = y2f - y1f;
						if (fillColor) {
							writer.addVector(
								{
									type: "rect",
									x: x1f,
									y: y1f,
									w: bgWidth,
									h: bgHeight,
									lineWidth: 0,
									color: fillColor,
									fillOpacity: fillOpacity,
								},
								false,
								true,
								writer.context().backgroundLength[writer.context().page]
							);
						}

						if (overlayPattern) {
							writer.addVector(
								{
									type: "rect",
									x: x1f,
									y: y1f,
									w: bgWidth,
									h: bgHeight,
									lineWidth: 0,
									color: overlayPattern,
									fillOpacity: overlayOpacity,
								},
								false,
								true
							);
						}
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
						this.tableNode.table.body[rowIndex + j][i]._colSpan =
							row[i].colSpan;
					}
				}

				// fix rowSpans
				if (row[i].rowSpan && row[i].rowSpan > 1) {
					for (let j = 1; j < row[i].rowSpan; j++) {
						this.tableNode.table.body[rowIndex + j][i]._rowSpanCurrentOffset =
							j;
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
			const pageChangedCallback = () => {
				if (!this.headerRows && this.layout.hLineWhenBroken !== false) {
					this.drawHorizontalLine(rowIndex, writer);
				}
			};

			writer.addListener("pageChanged", pageChangedCallback);

			writer.commitUnbreakableBlock();

			writer.removeListener("pageChanged", pageChangedCallback);
		}

		if (
			this.headerRepeatable &&
			(rowIndex === this.rowsWithoutPageBreak - 1 ||
				rowIndex === this.tableNode.table.body.length - 1)
		) {
			writer.commitUnbreakableBlock();
			writer.pushToRepeatables(this.headerRepeatable);
			this.cleanUpRepeatables = true;
			this.headerRepeatable = null;
		}
		// begin - Vertical alignment
		this.tableNode.table.__rowsHeight[rowIndex].height =
			endingY - this.tableNode.table.__rowsHeight[rowIndex].top;
		// end - Vertical alignment
	}
}

export default TableProcessor;
