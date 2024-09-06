import ColumnCalculator from './columnCalculator';
import DocMeasure from './DocMeasure';
import DocPreprocessor from './DocPreprocessor';
import DocumentContext from './DocumentContext';
import { getNodeId, stringifyNode } from './helpers/node';
import { offsetVector, pack } from './helpers/tools';
import { isNumber, isString, isValue } from './helpers/variableType';
import Line from './Line';
import PageElementWriter from './PageElementWriter';
import StyleContextStack from './StyleContextStack';
import TableProcessor from './TableProcessor';
import TextInlines from './TextInlines';

function addAll(target, otherArray) {
	otherArray.forEach(item => {
		target.push(item);
	});
}

/**
 * Layout engine which turns document-definition-object into a set of pages, lines, inlines
 * and vectors ready to be rendered into a PDF
 */
class LayoutBuilder {
	/**
	 * @param {object} pageSize - an object defining page width and height
	 * @param {object} pageMargins - an object defining top, left, right and bottom margins
	 * @param {object} svgMeasure
	 */
	constructor(pageSize, pageMargins, svgMeasure) {
		this.pageSize = pageSize;
		this.pageMargins = pageMargins;
		this.svgMeasure = svgMeasure;
		this.tableLayouts = {};
		// begin - Vertical alignment
		this.__nodesHierarchy = [];
		// end - Vertical alignment
	}

	registerTableLayouts(tableLayouts) {
		this.tableLayouts = pack(this.tableLayouts, tableLayouts);
	}

	/**
	 * Executes layout engine on document-definition-object and creates an array of pages
	 * containing positioned Blocks, Lines and inlines
	 *
	 * @param {object} docStructure document-definition-object
	 * @param {object} pdfDocument pdfkit document
	 * @param {object} styleDictionary dictionary with style definitions
	 * @param {object} defaultStyle default style definition
	 * @param {object} background
	 * @param {object} header
	 * @param {object} footer
	 * @param {object} watermark
	 * @param {object} pageBreakBeforeFct
	 * @returns {Array} an array of pages
	 */
	layoutDocument(
		docStructure,
		pdfDocument,
		styleDictionary,
		defaultStyle,
		background,
		header,
		footer,
		watermark,
		pageBreakBeforeFct
	) {

		function addPageBreaksIfNecessary(linearNodeList, pages) {

			if (typeof pageBreakBeforeFct !== 'function') {
				return false;
			}

			linearNodeList = linearNodeList.filter(node => node.positions.length > 0);

			linearNodeList.forEach(node => {
				let nodeInfo = {};
				[
					'id', 'text', 'ul', 'ol', 'table', 'image', 'qr', 'canvas', 'svg', 'columns',
					'headlineLevel', 'style', 'pageBreak', 'pageOrientation',
					'width', 'height'
				].forEach(key => {
					if (node[key] !== undefined) {
						nodeInfo[key] = node[key];
					}
				});
				nodeInfo.startPosition = node.positions[0];
				nodeInfo.pageNumbers = Array.from(new Set(node.positions.map(node => node.pageNumber)));
				nodeInfo.pages = pages.length;
				nodeInfo.stack = Array.isArray(node.stack);

				node.nodeInfo = nodeInfo;
			});

			for (let index = 0; index < linearNodeList.length; index++) {
				let node = linearNodeList[index];
				if (node.pageBreak !== 'before' && !node.pageBreakCalculated) {
					node.pageBreakCalculated = true;
					let pageNumber = node.nodeInfo.pageNumbers[0];

					if (
						pageBreakBeforeFct(node.nodeInfo, {
							getFollowingNodesOnPage: () => {
								let followingNodesOnPage = [];
								for (let ii = index + 1, l = linearNodeList.length; ii < l; ii++) {
									if (linearNodeList[ii].nodeInfo.pageNumbers.indexOf(pageNumber) > -1) {
										followingNodesOnPage.push(linearNodeList[ii].nodeInfo);
									}
								}
								return followingNodesOnPage;
							},
							getNodesOnNextPage: () => {
								let nodesOnNextPage = [];
								for (let ii = index + 1, l = linearNodeList.length; ii < l; ii++) {
									if (linearNodeList[ii].nodeInfo.pageNumbers.indexOf(pageNumber + 1) > -1) {
										nodesOnNextPage.push(linearNodeList[ii].nodeInfo);
									}
								}
								return nodesOnNextPage;
							},
							getPreviousNodesOnPage: () => {
								let previousNodesOnPage = [];
								for (let ii = 0; ii < index; ii++) {
									if (linearNodeList[ii].nodeInfo.pageNumbers.indexOf(pageNumber) > -1) {
										previousNodesOnPage.push(linearNodeList[ii].nodeInfo);
									}
								}
								return previousNodesOnPage;
							},
						})
					) {
						node.pageBreak = 'before';
						return true;
					}
				}
			}

			return false;
		}

		this.docPreprocessor = new DocPreprocessor();
		this.docMeasure = new DocMeasure(pdfDocument, styleDictionary, defaultStyle, this.svgMeasure, this.tableLayouts);
		// begin - Vertical alignment
		this.__nodesHierarchy = [];
		// end - Vertical alignment

		function resetXYs(result) {
			result.linearNodeList.forEach(node => {
				node.resetXY();
			});
		}

		let result = this.tryLayoutDocument(docStructure, pdfDocument, styleDictionary, defaultStyle, background, header, footer, watermark);
		while (addPageBreaksIfNecessary(result.linearNodeList, result.pages)) {
			resetXYs(result);
			result = this.tryLayoutDocument(docStructure, pdfDocument, styleDictionary, defaultStyle, background, header, footer, watermark);
		}

		return result.pages;
	}

	tryLayoutDocument(
		docStructure,
		pdfDocument,
		styleDictionary,
		defaultStyle,
		background,
		header,
		footer,
		watermark
	) {

		this.linearNodeList = [];
		docStructure = this.docPreprocessor.preprocessDocument(docStructure);
		docStructure = this.docMeasure.measureDocument(docStructure);

		this.writer = new PageElementWriter(
			new DocumentContext(this.pageSize, this.pageMargins));

		this.writer.context().addListener('pageAdded', () => {
			this.addBackground(background);
		});

		this.addBackground(background);
		this.processNode(docStructure);
		this.addHeadersAndFooters(header, footer);
		if (watermark != null) {
			this.addWatermark(watermark, pdfDocument, defaultStyle);
		}

		return { pages: this.writer.context().pages, linearNodeList: this.linearNodeList };
	}

	addBackground(background) {
		let backgroundGetter = typeof background === 'function' ? background : () => background;

		let context = this.writer.context();
		let pageSize = context.getCurrentPage().pageSize;

		let pageBackground = backgroundGetter(context.page + 1, pageSize);

		if (pageBackground) {
			this.writer.beginUnbreakableBlock(pageSize.width, pageSize.height);
			pageBackground = this.docPreprocessor.preprocessDocument(pageBackground);
			this.processNode(this.docMeasure.measureDocument(pageBackground));
			this.writer.commitUnbreakableBlock(0, 0);
			context.backgroundLength[context.page] += pageBackground.positions.length;
		}
	}

	addStaticRepeatable(headerOrFooter, sizeFunction) {
		this.addDynamicRepeatable(() => // copy to new object
			JSON.parse(JSON.stringify(headerOrFooter)), sizeFunction);
	}

	addDynamicRepeatable(nodeGetter, sizeFunction) {
		let pages = this.writer.context().pages;

		for (let pageIndex = 0, l = pages.length; pageIndex < l; pageIndex++) {
			this.writer.context().page = pageIndex;

			let node = nodeGetter(pageIndex + 1, l, this.writer.context().pages[pageIndex].pageSize);

			if (node) {
				let sizes = sizeFunction(this.writer.context().getCurrentPage().pageSize, this.pageMargins);
				this.writer.beginUnbreakableBlock(sizes.width, sizes.height);
				node = this.docPreprocessor.preprocessDocument(node);
				this.processNode(this.docMeasure.measureDocument(node));
				this.writer.commitUnbreakableBlock(sizes.x, sizes.y);
			}
		}
	}

	addHeadersAndFooters(header, footer) {
		const headerSizeFct = (pageSize, pageMargins) => ({
			x: 0,
			y: 0,
			width: pageSize.width,
			height: pageMargins.top
		});

		const footerSizeFct = (pageSize, pageMargins) => ({
			x: 0,
			y: pageSize.height - pageMargins.bottom,
			width: pageSize.width,
			height: pageMargins.bottom
		});

		if (typeof header === 'function') {
			this.addDynamicRepeatable(header, headerSizeFct);
		} else if (header) {
			this.addStaticRepeatable(header, headerSizeFct);
		}

		if (typeof footer === 'function') {
			this.addDynamicRepeatable(footer, footerSizeFct);
		} else if (footer) {
			this.addStaticRepeatable(footer, footerSizeFct);
		}
	}

	addWatermark(watermark, pdfDocument, defaultStyle) {
		if (isString(watermark)) {
			watermark = { 'text': watermark };
		}

		if (!watermark.text) { // empty watermark text
			return;
		}

		watermark.font = watermark.font || defaultStyle.font || 'Roboto';
		watermark.fontSize = watermark.fontSize || 'auto';
		watermark.color = watermark.color || 'black';
		watermark.opacity = isNumber(watermark.opacity) ? watermark.opacity : 0.6;
		watermark.bold = watermark.bold || false;
		watermark.italics = watermark.italics || false;
		watermark.angle = isValue(watermark.angle) ? watermark.angle : null;

		if (watermark.angle === null) {
			watermark.angle = Math.atan2(this.pageSize.height, this.pageSize.width) * -180 / Math.PI;
		}

		if (watermark.fontSize === 'auto') {
			watermark.fontSize = getWatermarkFontSize(this.pageSize, watermark, pdfDocument);
		}

		let watermarkObject = {
			text: watermark.text,
			font: pdfDocument.provideFont(watermark.font, watermark.bold, watermark.italics),
			fontSize: watermark.fontSize,
			color: watermark.color,
			opacity: watermark.opacity,
			angle: watermark.angle
		};

		watermarkObject._size = getWatermarkSize(watermark, pdfDocument);

		let pages = this.writer.context().pages;
		for (let i = 0, l = pages.length; i < l; i++) {
			pages[i].watermark = watermarkObject;
		}

		function getWatermarkSize(watermark, pdfDocument) {
			let textInlines = new TextInlines(pdfDocument);
			let styleContextStack = new StyleContextStack(null, { font: watermark.font, bold: watermark.bold, italics: watermark.italics });

			styleContextStack.push({
				fontSize: watermark.fontSize
			});

			let size = textInlines.sizeOfText(watermark.text, styleContextStack);
			let rotatedSize = textInlines.sizeOfRotatedText(watermark.text, watermark.angle, styleContextStack);

			return { size: size, rotatedSize: rotatedSize };
		}

		function getWatermarkFontSize(pageSize, watermark, pdfDocument) {
			let textInlines = new TextInlines(pdfDocument);
			let styleContextStack = new StyleContextStack(null, { font: watermark.font, bold: watermark.bold, italics: watermark.italics });
			let rotatedSize;

			/**
			 * Binary search the best font size.
			 * Initial bounds [0, 1000]
			 * Break when range < 1
			 */
			let a = 0;
			let b = 1000;
			let c = (a + b) / 2;
			while (Math.abs(a - b) > 1) {
				styleContextStack.push({
					fontSize: c
				});
				rotatedSize = textInlines.sizeOfRotatedText(watermark.text, watermark.angle, styleContextStack);

				if (rotatedSize.width > pageSize.width) {
					b = c;
					c = (a + b) / 2;
				} else if (rotatedSize.width < pageSize.width) {
					if (rotatedSize.height > pageSize.height) {
						b = c;
						c = (a + b) / 2;
					} else {
						a = c;
						c = (a + b) / 2;
					}
				}
				styleContextStack.pop();
			}
			/*
			 End binary search
			 */
			return c;
		}
	}

	processNode(node) {
		const applyMargins = callback => {
			let margin = node._margin;

			if (node.pageBreak === 'before') {
				this.writer.moveToNextPage(node.pageOrientation);
			} else if (node.pageBreak === 'beforeOdd') {
				this.writer.moveToNextPage(node.pageOrientation);
				if ((this.writer.context().page + 1) % 2 === 1) {
					this.writer.moveToNextPage(node.pageOrientation);
				}
			} else if (node.pageBreak === 'beforeEven') {
				this.writer.moveToNextPage(node.pageOrientation);
				if ((this.writer.context().page + 1) % 2 === 0) {
					this.writer.moveToNextPage(node.pageOrientation);
				}
			}

			if (margin) {
				this.writer.context().moveDown(margin[1]);
				this.writer.context().addMargin(margin[0], margin[2]);
			}

			callback();

			if (margin) {
				this.writer.context().addMargin(-margin[0], -margin[2]);
				this.writer.context().moveDown(margin[3]);
			}

			if (node.pageBreak === 'after') {
				this.writer.moveToNextPage(node.pageOrientation);
			} else if (node.pageBreak === 'afterOdd') {
				this.writer.moveToNextPage(node.pageOrientation);
				if ((this.writer.context().page + 1) % 2 === 1) {
					this.writer.moveToNextPage(node.pageOrientation);
				}
			} else if (node.pageBreak === 'afterEven') {
				this.writer.moveToNextPage(node.pageOrientation);
				if ((this.writer.context().page + 1) % 2 === 0) {
					this.writer.moveToNextPage(node.pageOrientation);
				}
			}
		};

		this.linearNodeList.push(node);
		decorateNode(node);

		applyMargins(() => {
			let unbreakable = node.unbreakable;
			if (unbreakable) {
				this.writer.beginUnbreakableBlock();
			}

			let absPosition = node.absolutePosition;
			if (absPosition) {
				this.writer.context().beginDetachedBlock();
				this.writer.context().moveTo(absPosition.x || 0, absPosition.y || 0);
			}

			let relPosition = node.relativePosition;
			if (relPosition) {
				this.writer.context().beginDetachedBlock();
				this.writer.context().moveToRelative(relPosition.x || 0, relPosition.y || 0);
			}

			if (node.stack) {
				this.processVerticalContainer(node);
			} else if (node.columns) {
				this.processColumns(node);
			} else if (node.ul) {
				this.processList(false, node);
			} else if (node.ol) {
				this.processList(true, node);
			} else if (node.table) {
				this.processTable(node);
			} else if (node.text !== undefined) {
				this.processLeaf(node);
			} else if (node.toc) {
				this.processToc(node);
			} else if (node.image) {
				this.processImage(node);
			} else if (node.svg) {
				this.processSVG(node);
			} else if (node.canvas) {
				this.processCanvas(node);
			} else if (node.qr) {
				this.processQr(node);
			} else if (node.attachment) {
				this.processAttachment(node);
			} else if (!node._span) {
				throw new Error(`Unrecognized document structure: ${stringifyNode(node)}`);
			}

			if (absPosition || relPosition) {
				this.writer.context().endDetachedBlock();
			}

			if (unbreakable) {
				this.writer.commitUnbreakableBlock();
			}
		});
	}

	// vertical container
	processVerticalContainer(node) {
		// begin - Vertical alignment
		this.__nodesHierarchy.push(node);
		node.__contentHeight = 0;
		// end - Vertical alignment

		node.stack.forEach(item => {
			this.processNode(item);
			addAll(node.positions, item.positions);

			//TODO: paragraph gap
		}, this);
		// begin - Vertical alignment
		const lastNode = this.__nodesHierarchy.pop();
		this.__nodesHierarchy.length > 0 && (this.__nodesHierarchy[this.__nodesHierarchy.length - 1].__contentHeight += lastNode.__contentHeight);
		// end - Vertical alignment
	}

	// columns
	processColumns(columnNode) {
		let columns = columnNode.columns;
		let availableWidth = this.writer.context().availableWidth;
		let gaps = gapArray(columnNode._gap);

		if (gaps) {
			availableWidth -= (gaps.length - 1) * columnNode._gap;
		}
		// begin - Vertical alignment
		columnNode.__contentHeight = 0;
		this.__nodesHierarchy.push(columnNode);
		// end - Vertical alignment

		ColumnCalculator.buildColumnWidths(columns, availableWidth);
		let result = this.processRow(false, columns, columns, gaps);
		addAll(columnNode.positions, result.positions);

		function gapArray(gap) {
			if (!gap) {
				return null;
			}

			let gaps = [];
			gaps.push(0);

			for (let i = columns.length - 1; i > 0; i--) {
				gaps.push(gap);
			}

			return gaps;
		}
		// begin - Vertical alignment
		const lastNode = this.__nodesHierarchy.pop();
		lastNode.__contentHeight = Math.max(...columns.map(c => c.__contentHeight));
		this.__nodesHierarchy[this.__nodesHierarchy.length - 1].__contentHeight += lastNode.__contentHeight;
		// end - Vertical alignment
	}

	findStartingSpanCell(arr, i) {
		let requiredColspan = 1;
    for (let index = i - 1; index >= 0; index--) {
        if (!arr[index]._span) {
					if (arr[index].rowSpan > 1 && (arr[index].colSpan || 1) === requiredColspan) {
            return arr[index];
					} else {
						return null;
					}
        }
				requiredColspan++;
    }
    return null;
	}

	processRow(dontBreakRows, columns, widths, gaps, tableBody, tableRow, height) {
		const updatePageBreakData = (page, prevY) => {
			let pageDesc;
			// Find page break data for this row and page
      for (let i = 0, l = pageBreaks.length; i < l; i++) {
        let desc = pageBreaks[i];
        if (desc.prevPage === page) {
          pageDesc = desc;
          break;
        }
      }
			// If row has page break in this page, update prevY
			if (pageDesc) {
				pageDesc.prevY = Math.max(pageDesc.prevY, prevY);
			}
		};

		const storePageBreakData = data => {
			let pageDesc;

			for (let i = 0, l = pageBreaks.length; i < l; i++) {
				let desc = pageBreaks[i];
				if (desc.prevPage === data.prevPage) {
					pageDesc = desc;
					break;
				}
			}

			if (!pageDesc) {
				pageDesc = data;
				pageBreaks.push(pageDesc);
			}
			pageDesc.prevY = Math.max(pageDesc.prevY, data.prevY);
			pageDesc.y = Math.min(pageDesc.y, data.y);
		};

		let pageBreaks = [];
		let positions = [];

		this.writer.addListener('pageChanged', storePageBreakData);

		widths = widths || columns;

		this.writer.context().beginColumnGroup();

		for (let i = 0, l = columns.length; i < l; i++) {
			let column = columns[i];
			let width = widths[i]._calcWidth;
			let leftOffset = colLeftOffset(i);

			if (column.colSpan && column.colSpan > 1) {
				for (let j = 1; j < column.colSpan; j++) {
					width += widths[++i]._calcWidth + gaps[i];
				}
			}

			// if rowspan starts in this cell, we retrieve the last cell affected by the rowspan
			const endingCell = getEndingCell(column, i);
			if (endingCell) {
				// We store a reference of the ending cell in the first cell of the rowspan
				column._endingCell = endingCell;
				column._endingCell._startingRowSpanY = column._startingRowSpanY;
			}

			// Check if exists and retrieve the cell that started the rowspan in case we are in the cell just after
			let startingSpanCell = this.findStartingSpanCell(columns, i);
			let endingSpanCell = null;
			if (startingSpanCell && startingSpanCell._endingCell) {
				// Reference to the last cell of the rowspan
				endingSpanCell = startingSpanCell._endingCell;
				// Store if we are in an unbreakable block when we save the context and the originalX
				if (this.writer.transactionLevel > 0) {
					endingSpanCell._isUnbreakableContext = true;
					endingSpanCell._originalXOffset = this.writer.originalX;
				}
			}

			// We pass the endingSpanCell reference to store the context just after processing rowspan cell
			this.writer.context().beginColumn(width, leftOffset, endingSpanCell);

			if (!column._span) {
				this.processNode(column);
				addAll(positions, column.positions);
			} else if (column._columnEndingContext) {
				let discountY = 0;
				if (dontBreakRows) {
					// Calculate how many points we have to discount to Y when dontBreakRows and rowSpan are combined
					const ctxBeforeRowSpanLastRow = this.writer.contextStack[this.writer.contextStack.length - 1];
					discountY = ctxBeforeRowSpanLastRow.y - column._startingRowSpanY;
				}
				let originalXOffset = 0;
				// If context was saved from an unbreakable block and we are not in an unbreakable block anymore
				// We have to sum the originalX (X before starting unbreakable block) to X
				if (column._isUnbreakableContext && !this.writer.transactionLevel) {
					originalXOffset = column._originalXOffset;
				}
				// row-span ending
				// Recover the context after processing the rowspanned cell
				this.writer.context().markEnding(column, originalXOffset, discountY);
			}
		}

		// Check if last cell is part of a span
		let endingSpanCell = null;
		const lastColumn = columns.length > 0 ? columns[columns.length - 1] : null;
		if (lastColumn) {
			// Previous column cell has a rowspan
			if (lastColumn._endingCell) {
				endingSpanCell = lastColumn._endingCell;
			// Previous column cell is part of a span
			} else if (lastColumn._span === true) {
				// We get the cell that started the span where we set a reference to the ending cell
				const startingSpanCell = this.findStartingSpanCell(columns, columns.length);
				if (startingSpanCell) {
					// Context will be stored here (ending cell)
					endingSpanCell = startingSpanCell._endingCell;
					// Store if we are in an unbreakable block when we save the context and the originalX
					if (this.writer.transactionLevel > 0) {
						endingSpanCell._isUnbreakableContext = true;
						endingSpanCell._originalXOffset = this.writer.originalX;
					}
				}
			}
		}

		// If there are page breaks in this row, update data with prevY of last cell
		updatePageBreakData(this.writer.context().page, this.writer.context().y);

		this.writer.context().completeColumnGroup(height, endingSpanCell);

		this.writer.removeListener('pageChanged', storePageBreakData);

		return { pageBreaks: pageBreaks, positions: positions };

		function colLeftOffset(i) {
			if (gaps && gaps.length > i) {
				return gaps[i];
			}
			return 0;
		}

		function getEndingCell(column, columnIndex) {
			if (column.rowSpan && column.rowSpan > 1) {
				let endingRow = tableRow + column.rowSpan - 1;
				if (endingRow >= tableBody.length) {
					throw new Error(`Row span for column ${columnIndex} (with indexes starting from 0) exceeded row count`);
				}
				return tableBody[endingRow][columnIndex];
			}

			return null;
		}
	}

	// lists
	processList(orderedList, node) {
		const addMarkerToFirstLeaf = line => {
			// I'm not very happy with the way list processing is implemented
			// (both code and algorithm should be rethinked)
			if (nextMarker) {
				let marker = nextMarker;
				nextMarker = null;

				if (marker.canvas) {
					let vector = marker.canvas[0];
					// begin - Vertical alignment
					vector.__nodeRef = line.__nodeRef ? line.__nodeRef : line;
					vector._height = marker._maxHeight;
					// end - Vertical alignment

					offsetVector(vector, -marker._minWidth, 0);
					this.writer.addVector(vector);
				} else if (marker._inlines) {
					let markerLine = new Line(this.pageSize.width);
					// begin - Vertical alignment
					markerLine.__nodeRef = line.__nodeRef ? line.__nodeRef: line;
					// end - Vertical alignment
					markerLine.addInline(marker._inlines[0]);
					markerLine.x = -marker._minWidth;
					markerLine.y = line.getAscenderHeight() - markerLine.getAscenderHeight();
					this.writer.addLine(markerLine, true);
				}
			}
		};
		// begin - Vertical alignment
		this.__nodesHierarchy.push(node);
		node.__contentHeight = 0;
		// end - Vertical alignment

		let items = orderedList ? node.ol : node.ul;
		let gapSize = node._gapSize;

		this.writer.context().addMargin(gapSize.width);

		let nextMarker;

		this.writer.addListener('lineAdded', addMarkerToFirstLeaf);

		items.forEach(item => {
			// begin - Vertical alignment
			item.__nodeRef = node.__nodeRef ? node.__nodeRef : node;
			// end - Vertical alignment
			nextMarker = item.listMarker;
			this.processNode(item);
			addAll(node.positions, item.positions);
		});

		this.writer.removeListener('lineAdded', addMarkerToFirstLeaf);

		this.writer.context().addMargin(-gapSize.width);
		// begin - Vertical alignment
		const lastNode = this.__nodesHierarchy.pop();
		if(this.__nodesHierarchy[this.__nodesHierarchy.length - 1]) this.__nodesHierarchy[this.__nodesHierarchy.length - 1].__contentHeight += lastNode.__contentHeight;
		// end - Vertical alignment
	}

	// tables
	processTable(tableNode) {
		let processor = new TableProcessor(tableNode);

		processor.beginTable(this.writer);

		let rowHeights = tableNode.table.heights;
		for (let i = 0, l = tableNode.table.body.length; i < l; i++) {
			// if dontBreakRows and row starts a rowspan
			// we store the 'y' of the beginning of each rowSpan
			if (processor.dontBreakRows) {
				tableNode.table.body[i].forEach(cell => {
					if (cell.rowSpan && cell.rowSpan > 1) {
						cell._startingRowSpanY = this.writer.context().y;
					}
				});
			}

			processor.beginRow(i, this.writer);

			let height;
			if (typeof rowHeights === 'function') {
				height = rowHeights(i);
			} else if (Array.isArray(rowHeights)) {
				height = rowHeights[i];
			} else {
				height = rowHeights;
			}

			if (height === 'auto') {
				height = undefined;
			}

			let result = this.processRow(processor.dontBreakRows, tableNode.table.body[i], tableNode.table.widths, tableNode._offsets.offsets, tableNode.table.body, i, height);
			addAll(tableNode.positions, result.positions);

			processor.endRow(i, this.writer, result.pageBreaks);
		}

		processor.endTable(this.writer);
	}

	// leafs (texts)
	processLeaf(node) {
		// begin - Vertical alignment
		if(this.docPreprocessor)  node = this.docPreprocessor.checkNode(node);
		// end - Vertical alignment
		let line = this.buildNextLine(node);
		// begin - Vertical alignment
		line && (line.__nodeRef = node.__nodeRef ? node.__nodeRef : node);
		// end - Vertical alignment
		if (line && (node.tocItem || node.id)) {
			line._node = node;
		}
		let currentHeight = (line) ? line.getHeight() : 0;
		let maxHeight = node.maxHeight || -1;

		if (line) {
			let nodeId = getNodeId(node);
			if (nodeId) {
				line.id = nodeId;
			}
		}

		if (node._tocItemRef) {
			line._pageNodeRef = node._tocItemRef;
		}

		if (node._pageRef) {
			line._pageNodeRef = node._pageRef._nodeRef;
		}

		if (line && line.inlines && Array.isArray(line.inlines)) {
			for (let i = 0, l = line.inlines.length; i < l; i++) {
				if (line.inlines[i]._tocItemRef) {
					line.inlines[i]._pageNodeRef = line.inlines[i]._tocItemRef;
				}

				if (line.inlines[i]._pageRef) {
					line.inlines[i]._pageNodeRef = line.inlines[i]._pageRef._nodeRef;
				}
			}
		}

		while (line && (maxHeight === -1 || currentHeight < maxHeight)) {
			let positions = this.writer.addLine(line);
			node.positions.push(positions);
			line = this.buildNextLine(node);
			if (line) {
				// begin - Vertical alignment
				line.__nodeRef = node.__nodeRef ? node.__nodeRef : node;;
				// end - Vertical alignment
				currentHeight += line.getHeight();
			}
		}
		// begin - Vertical alignment
		node.__contentHeight = currentHeight;
		this.__nodesHierarchy.length > 0 && (this.__nodesHierarchy[this.__nodesHierarchy.length - 1].__contentHeight += currentHeight);
		// end - Vertical alignment
	}

	processToc(node) {
		if (node.toc.title) {
			this.processNode(node.toc.title);
		}
		if (node.toc._table) {
			this.processNode(node.toc._table);
		}
	}

	buildNextLine(textNode) {

		function cloneInline(inline) {
			let newInline = inline.constructor();
			for (let key in inline) {
				newInline[key] = inline[key];
			}
			return newInline;
		}

		if (!textNode._inlines || textNode._inlines.length === 0) {
			return null;
		}

		let line = new Line(this.writer.context().availableWidth);
		const textInlines = new TextInlines(null);

		let isForceContinue = false;
		while (textNode._inlines && textNode._inlines.length > 0 &&
			(line.hasEnoughSpaceForInline(textNode._inlines[0], textNode._inlines.slice(1)) || isForceContinue)) {
			let isHardWrap = false;
			let inline = textNode._inlines.shift();
			isForceContinue = false;

			if (!inline.noWrap && inline.text.length > 1 && inline.width > line.getAvailableWidth()) {
				let widthPerChar = inline.width / inline.text.length;
				let maxChars = Math.floor(line.getAvailableWidth() / widthPerChar);
				if (maxChars < 1) {
					maxChars = 1;
				}
				if (maxChars < inline.text.length) {
					let newInline = cloneInline(inline);

					newInline.text = inline.text.substr(maxChars);
					inline.text = inline.text.substr(0, maxChars);

					newInline.width = textInlines.widthOfText(newInline.text, newInline);
					inline.width = textInlines.widthOfText(inline.text, inline);

					textNode._inlines.unshift(newInline);
					isHardWrap = true;
				}
			}

			line.addInline(inline);

			isForceContinue = inline.noNewLine && !isHardWrap;
		}

		line.lastLineInParagraph = textNode._inlines.length === 0;

		return line;
	}

	// images
	processImage(node) {
		let position = this.writer.addImage(node);
		node.positions.push(position);
	}

	processCanvas(node) {
		let positions = this.writer.addCanvas(node);
		addAll(node.positions, positions);
	}

	processSVG(node) {
		let position = this.writer.addSVG(node);
		node.positions.push(position);
	}

	processQr(node) {
		let position = this.writer.addQr(node);
		node.positions.push(position);
	}

	processAttachment(node) {
		let position = this.writer.addAttachment(node);
		node.positions.push(position);
	}
}

function decorateNode(node) {
	let x = node.x;
	let y = node.y;
	node.positions = [];

	if (Array.isArray(node.canvas)) {
		node.canvas.forEach(vector => {
			let x = vector.x;
			let y = vector.y;
			let x1 = vector.x1;
			let y1 = vector.y1;
			let x2 = vector.x2;
			let y2 = vector.y2;
			vector.resetXY = () => {
				vector.x = x;
				vector.y = y;
				vector.x1 = x1;
				vector.y1 = y1;
				vector.x2 = x2;
				vector.y2 = y2;
			};
		});
	}

	node.resetXY = () => {
		node.x = x;
		node.y = y;
		if (Array.isArray(node.canvas)) {
			node.canvas.forEach(vector => {
				vector.resetXY();
			});
		}
	};
}

export default LayoutBuilder;
