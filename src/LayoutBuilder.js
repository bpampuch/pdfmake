import DocPreprocessor from './DocPreprocessor';
import DocMeasure from './DocMeasure';
import DocumentContext from './DocumentContext';
import PageElementWriter from './PageElementWriter';
import ColumnCalculator from './columnCalculator';
import TableProcessor from './TableProcessor';
import Line from './Line';
import { isString, isValue, isNumber } from './helpers/variableType';
import { stringifyNode, getNodeId } from './helpers/node';
import { pack, offsetVector, convertToDynamicContent } from './helpers/tools';
import TextInlines from './TextInlines';
import StyleContextStack from './StyleContextStack';

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
		this.nestedLevel = 0;
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

		const isNecessaryAddFirstPage = (docStructure) => {
			if (docStructure.stack && docStructure.stack.length > 0 && docStructure.stack[0].section) {
				return false;
			} else if (docStructure.section) {
				return false;
			}

			return true;
		};

		this.linearNodeList = [];
		docStructure = this.docPreprocessor.preprocessDocument(docStructure);
		docStructure = this.docMeasure.measureDocument(docStructure);

		this.writer = new PageElementWriter(new DocumentContext());

		this.writer.context().addListener('pageAdded', (page) => {
			let backgroundGetter = background;
			if (page.customProperties['background'] || page.customProperties['background'] === null) {
				backgroundGetter = page.customProperties['background'];
			}

			this.addBackground(backgroundGetter);
		});

		if (isNecessaryAddFirstPage(docStructure)) {
			this.writer.addPage(
				this.pageSize,
				null,
				this.pageMargins
			);
		}

		this.processNode(docStructure);
		this.addHeadersAndFooters(header, footer);
		this.addWatermark(watermark, pdfDocument, defaultStyle);

		return { pages: this.writer.context().pages, linearNodeList: this.linearNodeList };
	}

	addBackground(background) {
		let backgroundGetter = typeof background === 'function' ? background : () => background;

		let context = this.writer.context();
		let pageSize = context.getCurrentPage().pageSize;

		let pageBackground = backgroundGetter(context.page + 1, pageSize);

		if (pageBackground) {
			this.writer.beginUnbreakableBlock(pageSize.width, pageSize.height);
			pageBackground = this.docPreprocessor.preprocessBlock(pageBackground);
			this.processNode(this.docMeasure.measureBlock(pageBackground));
			this.writer.commitUnbreakableBlock(0, 0);
			context.backgroundLength[context.page] += pageBackground.positions.length;
		}
	}

	addDynamicRepeatable(nodeGetter, sizeFunction, customPropertyName) {
		let pages = this.writer.context().pages;

		for (let pageIndex = 0, l = pages.length; pageIndex < l; pageIndex++) {
			this.writer.context().page = pageIndex;

			let customProperties = this.writer.context().getCurrentPage().customProperties;

			let pageNodeGetter = nodeGetter;
			if (customProperties[customPropertyName] || customProperties[customPropertyName] === null) {
				pageNodeGetter = customProperties[customPropertyName];
			}

			if ((typeof pageNodeGetter === 'undefined') || (pageNodeGetter === null)) {
				continue;
			}

			let node = pageNodeGetter(pageIndex + 1, l, this.writer.context().pages[pageIndex].pageSize);

			if (node) {
				let sizes = sizeFunction(this.writer.context().getCurrentPage().pageSize, this.writer.context().getCurrentPage().pageMargins);
				this.writer.beginUnbreakableBlock(sizes.width, sizes.height);
				node = this.docPreprocessor.preprocessBlock(node);
				this.processNode(this.docMeasure.measureBlock(node));
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

		this.addDynamicRepeatable(header, headerSizeFct, 'header');
		this.addDynamicRepeatable(footer, footerSizeFct, 'footer');
	}

	addWatermark(watermark, pdfDocument, defaultStyle) {
		let pages = this.writer.context().pages;
		for (let i = 0, l = pages.length; i < l; i++) {
			let pageWatermark = watermark;
			if (pages[i].customProperties['watermark'] || pages[i].customProperties['watermark'] === null) {
				pageWatermark = pages[i].customProperties['watermark'];
			}

			if (pageWatermark === undefined || pageWatermark === null) {
				continue;
			}

			if (isString(pageWatermark)) {
				pageWatermark = { 'text': pageWatermark };
			}

			if (!pageWatermark.text) { // empty watermark text
				continue;
			}

			pages[i].watermark = getWatermarkObject({ ...pageWatermark }, pages[i].pageSize, pdfDocument, defaultStyle);
		}

		function getWatermarkObject(watermark, pageSize, pdfDocument, defaultStyle) {
			watermark.font = watermark.font || defaultStyle.font || 'Roboto';
			watermark.fontSize = watermark.fontSize || 'auto';
			watermark.color = watermark.color || 'black';
			watermark.opacity = isNumber(watermark.opacity) ? watermark.opacity : 0.6;
			watermark.bold = watermark.bold || false;
			watermark.italics = watermark.italics || false;
			watermark.angle = isValue(watermark.angle) ? watermark.angle : null;

			if (watermark.angle === null) {
				watermark.angle = Math.atan2(pageSize.height, pageSize.width) * -180 / Math.PI;
			}

			if (watermark.fontSize === 'auto') {
				watermark.fontSize = getWatermarkFontSize(pageSize, watermark, pdfDocument);
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

			return watermarkObject;
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

			const isDetachedBlock = node.relativePosition || node.absolutePosition;

			// Detached nodes have no margins, their position is only determined by 'x' and 'y'
			if (margin && !isDetachedBlock) {
				const availableHeight = this.writer.context().availableHeight;
				// If top margin is bigger than available space, move to next page
				// Necessary for nodes inside tables
				if (availableHeight - margin[1] < 0) {
					// Consume the whole available space
					this.writer.context().moveDown(availableHeight);
					this.writer.moveToNextPage(node.pageOrientation);
					/**
					 * TODO - Something to consider:
					 * Right now the node starts at the top of next page (after header)
					 * Another option would be to apply just the top margin that has not been consumed in the page before
					 * It would something like: this.write.context().moveDown(margin[1] - availableHeight)
					 */
				} else {
					this.writer.context().moveDown(margin[1]);
				}
				// Apply lateral margins
				this.writer.context().addMargin(margin[0], margin[2]);
			}
			callback();

			// Detached nodes have no margins, their position is only determined by 'x' and 'y'
			if (margin && !isDetachedBlock) {
				const availableHeight = this.writer.context().availableHeight;
				// If bottom margin is bigger than available space, move to next page
				// Necessary for nodes inside tables
				if (availableHeight - margin[3] < 0) {
					this.writer.context().moveDown(availableHeight);
					this.writer.moveToNextPage(node.pageOrientation);
					/**
					 * TODO - Something to consider:
					 * Right now next node starts at the top of next page (after header)
					 * Another option would be to apply the bottom margin that has not been consumed in the next page?
					 * It would something like: this.write.context().moveDown(margin[3] - availableHeight)
					 */
				} else {
					this.writer.context().moveDown(margin[3]);
				}
				// Apply lateral margins
				this.writer.context().addMargin(-margin[0], -margin[2]);
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
			} else if (node.section) {
				this.processSection(node);
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
		node.stack.forEach(item => {
			this.processNode(item);
			addAll(node.positions, item.positions);

			//TODO: paragraph gap
		}, this);
	}

	// section
	processSection(sectionNode) {
		// TODO: properties

		let page = this.writer.context().getCurrentPage();
		if (!page || (page && page.items.length)) { // move to new empty page
			// page definition inherit from current page
			if (sectionNode.pageSize === 'inherit') {
				sectionNode.pageSize = page ? { width: page.pageSize.width, height: page.pageSize.height } : undefined;
			}
			if (sectionNode.pageOrientation === 'inherit') {
				sectionNode.pageOrientation = page ? page.pageSize.orientation : undefined;
			}
			if (sectionNode.pageMargins === 'inherit') {
				sectionNode.pageMargins = page ? page.pageMargins : undefined;
			}

			if (sectionNode.header === 'inherit') {
				sectionNode.header = page ? page.customProperties.header : undefined;
			}

			if (sectionNode.footer === 'inherit') {
				sectionNode.footer = page ? page.customProperties.footer : undefined;
			}

			if (sectionNode.background === 'inherit') {
				sectionNode.background = page ? page.customProperties.background : undefined;
			}

			if (sectionNode.watermark === 'inherit') {
				sectionNode.watermark = page ? page.customProperties.watermark : undefined;
			}

			if (sectionNode.header && typeof sectionNode.header !== 'function' && sectionNode.header !== null) {
				sectionNode.header = convertToDynamicContent(sectionNode.header);
			}

			if (sectionNode.footer && typeof sectionNode.footer !== 'function' && sectionNode.footer !== null) {
				sectionNode.footer = convertToDynamicContent(sectionNode.footer);
			}

			let customProperties = {};
			if (typeof sectionNode.header !== 'undefined') {
				customProperties.header = sectionNode.header;
			}

			if (typeof sectionNode.footer !== 'undefined') {
				customProperties.footer = sectionNode.footer;
			}

			if (typeof sectionNode.background !== 'undefined') {
				customProperties.background = sectionNode.background;
			}

			if (typeof sectionNode.watermark !== 'undefined') {
				customProperties.watermark = sectionNode.watermark;
			}

			this.writer.addPage(
				sectionNode.pageSize || this.pageSize,
				sectionNode.pageOrientation,
				sectionNode.pageMargins || this.pageMargins,
				customProperties
			);
		}

		this.processNode(sectionNode.section);
	}

	// columns
	processColumns(columnNode) {
		this.nestedLevel++;
		let columns = columnNode.columns;
		let availableWidth = this.writer.context().availableWidth;
		let gaps = gapArray(columnNode._gap);

		if (gaps) {
			availableWidth -= (gaps.length - 1) * columnNode._gap;
		}

		ColumnCalculator.buildColumnWidths(columns, availableWidth);
		let result = this.processRow({
			marginX: columnNode._margin ? [columnNode._margin[0], columnNode._margin[2]] : [0, 0],
			cells: columns,
			widths: columns,
			gaps
		});
		addAll(columnNode.positions, result.positions);
		this.nestedLevel--;
		if (this.nestedLevel === 0) {
			this.writer.context().resetMarginXTopParent();
		}
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
	}

	/**
	* Searches for a cell in the same row that starts a rowspan and is positioned immediately before the current cell.
	* Alternatively, it finds a cell where the colspan initiating the rowspan extends to the cell just before the current one.
	*
	* @param {Array<object>} arr - An array representing cells in a row.
	* @param {number} i - The index of the current cell to search backward from.
	* @returns {object|null} The starting cell of the rowspan if found; otherwise, `null`.
	*/
	_findStartingRowSpanCell(arr, i) {
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

	/**
	* Retrieves a page break description for a specified page from a list of page breaks.
	*
	* @param {Array<object>} pageBreaks - An array of page break descriptions, each containing `prevPage` properties.
	* @param {number} page - The page number to find the associated page break for.
	* @returns {object|undefined} The page break description object for the specified page if found; otherwise, `undefined`.
	*/
	_getPageBreak(pageBreaks, page) {
		return pageBreaks.find(desc => desc.prevPage === page);
	}

	_getPageBreakListBySpan(tableNode, page, rowIndex) {
		if (!tableNode || !tableNode._breaksBySpan) {
			return null;
		}
		const breaksList = tableNode._breaksBySpan.filter(desc => desc.prevPage === page && rowIndex <= desc.rowIndexOfSpanEnd);

		let y = Number.MAX_VALUE,
			prevY = Number.MIN_VALUE;

		breaksList.forEach(b => {
			prevY = Math.max(b.prevY, prevY);
			y = Math.min(b.y, y);
		});

		return {
			prevPage: page,
			prevY: prevY,
			y: y
		};
	}

	_findSameRowPageBreakByRowSpanData(breaksBySpan, page, rowIndex) {
		if (!breaksBySpan) {
			return null;
		}
		return breaksBySpan.find(desc => desc.prevPage === page && rowIndex === desc.rowIndexOfSpanEnd);
	}

	_updatePageBreaksData(pageBreaks, tableNode, rowIndex) {
		Object.keys(tableNode._bottomByPage).forEach(p => {
			const page = Number(p);
			const pageBreak = this._getPageBreak(pageBreaks, page);
			if (pageBreak) {
				pageBreak.prevY = Math.max(pageBreak.prevY, tableNode._bottomByPage[page]);
			}
			if (tableNode._breaksBySpan && tableNode._breaksBySpan.length > 0) {
				const breaksBySpanList = tableNode._breaksBySpan.filter(pb => pb.prevPage === page && rowIndex <= pb.rowIndexOfSpanEnd);

				if (breaksBySpanList && breaksBySpanList.length > 0) {
					breaksBySpanList.forEach(b => {
						b.prevY = Math.max(b.prevY, tableNode._bottomByPage[page]);
					});
				}
			}
		});
	}

	/**
	* Resolves the Y-coordinates for a target object by comparing two break points.
	*
	* @param {object} break1 - The first break point with `prevY` and `y` properties.
	* @param {object} break2 - The second break point with `prevY` and `y` properties.
	* @param {object} target - The target object to be updated with resolved Y-coordinates.
	* @property {number} target.prevY - Updated to the maximum `prevY` value between `break1` and `break2`.
	* @property {number} target.y - Updated to the minimum `y` value between `break1` and `break2`.
	*/
	_resolveBreakY(break1, break2, target) {
		target.prevY = Math.max(break1.prevY, break2.prevY);
		target.y = Math.min(break1.y, break2.y);
	};

	_storePageBreakData(data, startsRowSpan, pageBreaks, tableNode) {
		if (!startsRowSpan) {
			let pageDesc = this._getPageBreak(pageBreaks, data.prevPage);
			let pageDescBySpan = this._getPageBreakListBySpan(tableNode, data.prevPage, data.rowIndex);
			if (!pageDesc) {
				pageDesc = {
					...data
				};
				pageBreaks.push(pageDesc);
			}
			if (pageDescBySpan) {
				this._resolveBreakY(pageDesc, pageDescBySpan, pageDesc);
			}
			this._resolveBreakY(pageDesc, data, pageDesc);
		} else {
			const breaksBySpan = tableNode && tableNode._breaksBySpan || null;
			let pageDescBySpan = this._findSameRowPageBreakByRowSpanData(breaksBySpan, data.prevPage, data.rowIndex);
			if (!pageDescBySpan) {
				pageDescBySpan = {
					...data,
					rowIndexOfSpanEnd: data.rowIndex + data.rowSpan - 1
				};
				if (!tableNode._breaksBySpan) {
					tableNode._breaksBySpan = [];
				}
				tableNode._breaksBySpan.push(pageDescBySpan);
			}
			pageDescBySpan.prevY = Math.max(pageDescBySpan.prevY, data.prevY);
			pageDescBySpan.y = Math.min(pageDescBySpan.y, data.y);
			let pageDesc = this._getPageBreak(pageBreaks, data.prevPage);
			if (pageDesc) {
				this._resolveBreakY(pageDesc, pageDescBySpan, pageDesc);
			}
		}
	};

	/**
	* Calculates the left offset for a column based on the specified gap values.
	*
	* @param {number} i - The index of the column for which the offset is being calculated.
	* @param {Array<number>} gaps - An array of gap values for each column.
	* @returns {number} The left offset for the column. Returns `gaps[i]` if it exists, otherwise `0`.
	*/
	_colLeftOffset(i, gaps) {
		if (gaps && gaps.length > i) {
			return gaps[i];
		}
		return 0;
	}

	/**
	* Retrieves the ending cell for a row span in case it exists in a specified table column.
	*
	* @param {Array<Array<object>>} tableBody - The table body, represented as a 2D array of cell objects.
	* @param {number} rowIndex - The index of the starting row for the row span.
	* @param {object} column - The column object containing row span information.
	* @param {number} columnIndex - The index of the column within the row.
	* @returns {object|null} The cell at the end of the row span if it exists; otherwise, `null`.
	* @throws {Error} If the row span extends beyond the total row count.
	*/
	_getRowSpanEndingCell(tableBody, rowIndex, column, columnIndex) {
		if (column.rowSpan && column.rowSpan > 1) {
			let endingRow = rowIndex + column.rowSpan - 1;
			if (endingRow >= tableBody.length) {
				throw new Error(`Row span for column ${columnIndex} (with indexes starting from 0) exceeded row count`);
			}
			return tableBody[endingRow][columnIndex];
		}

		return null;
	}

	processRow({ marginX = [0, 0], dontBreakRows = false, rowsWithoutPageBreak = 0, cells, widths, gaps, tableNode, tableBody, rowIndex, height }) {
		const isUnbreakableRow = dontBreakRows || rowIndex <= rowsWithoutPageBreak - 1;
		let pageBreaks = [];
		let pageBreaksByRowSpan = [];
		let positions = [];
		let willBreakByHeight = false;
		widths = widths || cells;

		// Check if row should break by height
		if (!isUnbreakableRow && height > this.writer.context().availableHeight) {
			willBreakByHeight = true;
		}

		// Use the marginX if we are in a top level table/column (not nested)
		const marginXParent = this.nestedLevel === 1 ? marginX : null;
		const _bottomByPage = tableNode ? tableNode._bottomByPage : null;
		this.writer.context().beginColumnGroup(marginXParent, _bottomByPage);

		for (let i = 0, l = cells.length; i < l; i++) {
			let cell = cells[i];

			// Page change handler
			const storePageBreakClosure = data => {
				const startsRowSpan = cell.rowSpan && cell.rowSpan > 1;
				if (startsRowSpan) {
					data.rowSpan = cell.rowSpan;
				}
				data.rowIndex = rowIndex;
				this._storePageBreakData(data, startsRowSpan, pageBreaks, tableNode);
			};

			this.writer.addListener('pageChanged', storePageBreakClosure);

			let width = widths[i]._calcWidth;
			let leftOffset = this._colLeftOffset(i, gaps);
			// Check if exists and retrieve the cell that started the rowspan in case we are in the cell just after
			let startingSpanCell = this._findStartingRowSpanCell(cells, i);

			if (cell.colSpan && cell.colSpan > 1) {
				for (let j = 1; j < cell.colSpan; j++) {
					width += widths[++i]._calcWidth + gaps[i];
				}
			}

			// if rowspan starts in this cell, we retrieve the last cell affected by the rowspan
			const rowSpanEndingCell = this._getRowSpanEndingCell(tableBody, rowIndex, cell, i);
			if (rowSpanEndingCell) {
				// We store a reference of the ending cell in the first cell of the rowspan
				cell._endingCell = rowSpanEndingCell;
				cell._endingCell._startingRowSpanY = cell._startingRowSpanY;
			}

			// If we are after a cell that started a rowspan
			let endOfRowSpanCell = null;
			if (startingSpanCell && startingSpanCell._endingCell) {
				// Reference to the last cell of the rowspan
				endOfRowSpanCell = startingSpanCell._endingCell;
				// Store if we are in an unbreakable block when we save the context and the originalX
				if (this.writer.transactionLevel > 0) {
					endOfRowSpanCell._isUnbreakableContext = true;
					endOfRowSpanCell._originalXOffset = this.writer.originalX;
				}
			}

			// We pass the endingSpanCell reference to store the context just after processing rowspan cell
			this.writer.context().beginColumn(width, leftOffset, endOfRowSpanCell);

			if (!cell._span) {
				this.processNode(cell);
				this.writer.context().updateBottomByPage();
				addAll(positions, cell.positions);
			} else if (cell._columnEndingContext) {
				let discountY = 0;
				if (dontBreakRows) {
					// Calculate how many points we have to discount to Y when dontBreakRows and rowSpan are combined
					const ctxBeforeRowSpanLastRow = this.writer.contextStack[this.writer.contextStack.length - 1];
					discountY = ctxBeforeRowSpanLastRow.y - cell._startingRowSpanY;
				}
				let originalXOffset = 0;
				// If context was saved from an unbreakable block and we are not in an unbreakable block anymore
				// We have to sum the originalX (X before starting unbreakable block) to X
				if (cell._isUnbreakableContext && !this.writer.transactionLevel) {
					originalXOffset = cell._originalXOffset;
				}
				// row-span ending
				// Recover the context after processing the rowspanned cell
				this.writer.context().markEnding(cell, originalXOffset, discountY);
			}
			this.writer.removeListener('pageChanged', storePageBreakClosure);
		}

		// Check if last cell is part of a span
		let endingSpanCell = null;
		const lastColumn = cells.length > 0 ? cells[cells.length - 1] : null;
		if (lastColumn) {
			// Previous column cell has a rowspan
			if (lastColumn._endingCell) {
				endingSpanCell = lastColumn._endingCell;
				// Previous column cell is part of a span
			} else if (lastColumn._span === true) {
				// We get the cell that started the span where we set a reference to the ending cell
				const startingSpanCell = this._findStartingRowSpanCell(cells, cells.length);
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

		// If content did not break page, check if we should break by height
		if (willBreakByHeight && !isUnbreakableRow && pageBreaks.length === 0) {
			this.writer.context().moveDown(this.writer.context().availableHeight);
			this.writer.moveToNextPage();
		}

		const bottomByPage = this.writer.context().completeColumnGroup(height, endingSpanCell);

		if (tableNode) {
			tableNode._bottomByPage = bottomByPage;
			// If there are page breaks in this row, update data with prevY of last cell
			this._updatePageBreaksData(pageBreaks, tableNode, rowIndex);
		}

		return {
			pageBreaksBySpan: pageBreaksByRowSpan,
			pageBreaks: pageBreaks,
			positions: positions
		};
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

					offsetVector(vector, -marker._minWidth, 0);
					this.writer.addVector(vector);
				} else if (marker._inlines) {
					let markerLine = new Line(this.pageSize.width);
					markerLine.addInline(marker._inlines[0]);
					markerLine.x = -marker._minWidth;
					markerLine.y = line.getAscenderHeight() - markerLine.getAscenderHeight();
					this.writer.addLine(markerLine, true);
				}
			}
		};

		let items = orderedList ? node.ol : node.ul;
		let gapSize = node._gapSize;

		this.writer.context().addMargin(gapSize.width);

		let nextMarker;

		this.writer.addListener('lineAdded', addMarkerToFirstLeaf);

		items.forEach(item => {
			nextMarker = item.listMarker;
			this.processNode(item);
			addAll(node.positions, item.positions);
		});

		this.writer.removeListener('lineAdded', addMarkerToFirstLeaf);

		this.writer.context().addMargin(-gapSize.width);
	}

	// tables
	processTable(tableNode) {
		this.nestedLevel++;
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

			const pageBeforeProcessing = this.writer.context().page;

			let result = this.processRow({
				marginX: tableNode._margin ? [tableNode._margin[0], tableNode._margin[2]] : [0, 0],
				dontBreakRows: processor.dontBreakRows,
				rowsWithoutPageBreak: processor.rowsWithoutPageBreak,
				cells: tableNode.table.body[i],
				widths: tableNode.table.widths,
				gaps: tableNode._offsets.offsets,
				tableBody: tableNode.table.body,
				tableNode,
				rowIndex: i,
				height
			});

			addAll(tableNode.positions, result.positions);

			if (!result.pageBreaks || result.pageBreaks.length === 0) {
				const breaksBySpan = tableNode && tableNode._breaksBySpan || null;
				const breakBySpanData = this._findSameRowPageBreakByRowSpanData(breaksBySpan, pageBeforeProcessing, i);
				if (breakBySpanData) {
					const finalBreakBySpanData = this._getPageBreakListBySpan(tableNode, breakBySpanData.prevPage, i);
					result.pageBreaks.push(finalBreakBySpanData);
				}
			}

			processor.endRow(i, this.writer, result.pageBreaks);
		}

		processor.endTable(this.writer);
		this.nestedLevel--;
		if (this.nestedLevel === 0) {
			this.writer.context().resetMarginXTopParent();
		}
	}

	// leafs (texts)
	processLeaf(node) {
		let line = this.buildNextLine(node);
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
				currentHeight += line.getHeight();
			}
		}
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

		function findMaxFitLength(text, maxWidth, measureFn) {
			let low = 1;
			let high = text.length;
			let bestFit = 1;

			while (low <= high) {
				const mid = Math.floor((low + high) / 2);
				const part = text.substring(0, mid);
				const width = measureFn(part);

				if (width <= maxWidth) {
					bestFit = mid;
					low = mid + 1;
				} else {
					high = mid - 1;
				}
			}

			return bestFit;
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
				let maxChars = findMaxFitLength(inline.text, line.getAvailableWidth(), (txt) =>
					textInlines.widthOfText(txt, inline)
				);
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
