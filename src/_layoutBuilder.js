import {isString, isArray, isFunction, fontStringify, pack, offsetVector} from './helpers';
import TraversalTracker from './traversalTracker';
import DocPreprocessor from './docPreprocessor';
import DocMeasure from './docMeasure';
import DocumentContext from './documentContext';
import PageElementWriter from './pageElementWriter';
import ColumnCalculator from './columnCalculator';
import TableProcessor from './tableProcessor';
import Line from './line';
import TextTools from './textTools';
import StyleContextStack from './styleContextStack';

/**
 * Layout engine which turns document-definition-object into a set of pages,
 * lines, inlines and vectors ready to be rendered into a PDF
 */
class LayoutBuilder {

	/**
	 * @param {Object} pageSize - an object defining page width and height
	 * @param {Object} pageMargins - an object defining top, left, right and bottom margins
	 * @param {Object} imageMeasure
	 */
	constructor(pageSize, pageMargins, imageMeasure) {
		this.pageSize = pageSize;
		this.pageMargins = pageMargins;
		this.tracker = new TraversalTracker();
		this.imageMeasure = imageMeasure;
		this.tableLayouts = {};
	}

	registerTableLayouts(tableLayouts) {
		this.tableLayouts = pack(this.tableLayouts, tableLayouts);
	}

	/**
	 * Executes layout engine on document-definition-object and creates an array of pages
	 * containing positioned Blocks, Lines and inlines
	 *
	 * @param {Object} docStructure document-definition-object
	 * @param {Object} fontProvider font provider
	 * @param {Object} styleDictionary dictionary with style definitions
	 * @param {Object} defaultStyle default style definition
	 * @return {Array} an array of pages
	 */
	layoutDocument(
		docStructure,
		fontProvider,
		styleDictionary,
		defaultStyle,
		background,
		header,
		footer,
		images,
		watermark,
		pageBreakBeforeFct
		) {

		function addPageBreaksIfNecessary(linearNodeList, pages) {

			if (!isFunction(pageBreakBeforeFct)) {
				return false;
			}

			linearNodeList = linearNodeList.filter(node => node.positions.length > 0);

			linearNodeList.forEach(node => {
				let nodeInfo = {};
				[
					'id', 'text', 'ul', 'ol', 'table', 'image', 'qr', 'canvas', 'columns',
					'headlineLevel', 'style', 'pageBreak', 'pageOrientation',
					'width', 'height'
				].forEach(key => {
					if (node[key] !== undefined) {
						nodeInfo[key] = node[key];
					}
				});
				nodeInfo.startPosition = node.positions[0];
				nodeInfo.pageNumbers = node.positions.map((node) => node.pageNumber).filter((element, position, array) => array.indexOf(element) === position);
				nodeInfo.pages = pages.length;
				nodeInfo.stack = isArray(node.stack);

				node.nodeInfo = nodeInfo;
			});

			return linearNodeList.some((node, index, followingNodeList) => {
				if (node.pageBreak !== 'before' && !node.pageBreakCalculated) {
					node.pageBreakCalculated = true;
					let pageNumber = node.nodeInfo.pageNumbers[0];

					let followingNodesOnPage = followingNodeList.slice(index + 1).filter((node0) => node0.nodeInfo.pageNumbers.indexOf(pageNumber) > -1);

					let nodesOnNextPage = followingNodeList.slice(index + 1).filter((node0) => node0.nodeInfo.pageNumbers.indexOf(pageNumber + 1) > -1);

					let previousNodesOnPage = followingNodeList.slice(0, index).filter((node0) => node0.nodeInfo.pageNumbers.indexOf(pageNumber) > -1);

					if (
						pageBreakBeforeFct(
							node.nodeInfo,
							followingNodesOnPage.map(node => node.nodeInfo),
							nodesOnNextPage.map(node => node.nodeInfo),
							previousNodesOnPage.map(node => node.nodeInfo))) {
						node.pageBreak = 'before';
						return true;
					}
				}
			});
		}

		this.docPreprocessor = new DocPreprocessor();
		this.docMeasure = new DocMeasure(fontProvider, styleDictionary, defaultStyle, this.imageMeasure, this.tableLayouts, images);


		function resetXYs(result) {
			result.linearNodeList.forEach(node => {
				node.resetXY();
			});
		}

		let result = this.tryLayoutDocument(docStructure, fontProvider, styleDictionary, defaultStyle, background, header, footer, images, watermark);
		while (addPageBreaksIfNecessary(result.linearNodeList, result.pages)) {
			resetXYs(result);
			result = this.tryLayoutDocument(docStructure, fontProvider, styleDictionary, defaultStyle, background, header, footer, images, watermark);
		}

		return result.pages;
	}

	tryLayoutDocument(docStructure, fontProvider, styleDictionary, defaultStyle, background, header, footer, images, watermark, pageBreakBeforeFct) {

		this.linearNodeList = [];
		docStructure = this.docPreprocessor.preprocessDocument(docStructure);
		docStructure = this.docMeasure.measureDocument(docStructure);

		this.writer = new PageElementWriter(
			new DocumentContext(this.pageSize, this.pageMargins), this.tracker);

		this.writer.context().tracker.startTracking('pageAdded', () => {
			this.addBackground(background);
		});

		this.addBackground(background);
		this.processNode(docStructure);
		this.addHeadersAndFooters(header, footer);
		if (watermark != null) {
			this.addWatermark(watermark, fontProvider, defaultStyle);
		}

		return {pages: this.writer.context().pages, linearNodeList: this.linearNodeList};
	}

	addBackground(background) {
		let backgroundGetter = isFunction(background) ? background : () => background;
		let context = this.writer.context();
		let pageSize = context.getCurrentPage().pageSize;
		let pageBackground = backgroundGetter(context.page + 1, pageSize);

		if (pageBackground) {
			let pageSize = this.writer.context().getCurrentPage().pageSize;
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
		let headerSizeFct = (pageSize, pageMargins) => ({
				x: 0,
				y: 0,
				width: pageSize.width,
				height: pageMargins.top
			});

		let footerSizeFct = (pageSize, pageMargins) => ({
				x: 0,
				y: pageSize.height - pageMargins.bottom,
				width: pageSize.width,
				height: pageMargins.bottom
			});

		if (isFunction(header)) {
			this.addDynamicRepeatable(header, headerSizeFct);
		} else if (header) {
			this.addStaticRepeatable(header, headerSizeFct);
		}

		if (isFunction(footer)) {
			this.addDynamicRepeatable(footer, footerSizeFct);
		} else if (footer) {
			this.addStaticRepeatable(footer, footerSizeFct);
		}
	}

	addWatermark(watermark, fontProvider, defaultStyle) {
		if (isString(watermark)) {
			watermark = {'text': watermark};
		}

		if (!watermark.text) { // empty watermark text
			return;
		}

		watermark.font = watermark.font || defaultStyle.font || 'Roboto';
		watermark.color = watermark.color || 'black';
		watermark.opacity = watermark.opacity || 0.6;
		watermark.bold = watermark.bold || false;
		watermark.italics = watermark.italics || false;

		let watermarkObject = {
			text: watermark.text,
			font: fontProvider.provideFont(watermark.font, watermark.bold, watermark.italics),
			size: getSize(this.pageSize, watermark, fontProvider),
			color: watermark.color,
			opacity: watermark.opacity
		};

		let pages = this.writer.context().pages;
		for (let i = 0, l = pages.length; i < l; i++) {
			pages[i].watermark = watermarkObject;
		}

		function getSize(pageSize, watermark, fontProvider) {
			let width = pageSize.width;
			let height = pageSize.height;
			let targetWidth = Math.sqrt(width * width + height * height) * 0.8; /* page diagonal * sample factor */
			let textTools = new TextTools(fontProvider);
			let styleContextStack = new StyleContextStack(null, {font: watermark.font, bold: watermark.bold, italics: watermark.italics});
			let size;

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
				size = textTools.sizeOfString(watermark.text, styleContextStack);
				if (size.width > targetWidth) {
					b = c;
					c = (a + b) / 2;
				} else if (size.width < targetWidth) {
					a = c;
					c = (a + b) / 2;
				}
				styleContextStack.pop();
			}
			/*
			 End binary search
			 */
			return {size: size, fontSize: c};
		}
	}

	processNode(node) {
		var self = this;

		this.linearNodeList.push(node);
		decorateNode(node);

		applyMargins(() => {
			let unbreakable = node.unbreakable;
			if (unbreakable) {
				self.writer.beginUnbreakableBlock();
			}

			let absPosition = node.absolutePosition;
			if (absPosition) {
				self.writer.context().beginDetachedBlock();
				self.writer.context().moveTo(absPosition.x || 0, absPosition.y || 0);
			}

			let relPosition = node.relativePosition;
			if (relPosition) {
				self.writer.context().beginDetachedBlock();
				self.writer.context().moveTo((relPosition.x || 0) + self.writer.context().x, (relPosition.y || 0) + self.writer.context().y);
			}

			if (node.stack) {
				self.processVerticalContainer(node);
			} else if (node.columns) {
				self.processColumns(node);
			} else if (node.ul) {
				self.processList(false, node);
			} else if (node.ol) {
				self.processList(true, node);
			} else if (node.table) {
				self.processTable(node);
			} else if (node.text !== undefined) {
				self.processLeaf(node);
			} else if (node.toc) {
				self.processToc(node);
			} else if (node.image) {
				self.processImage(node);
			} else if (node.canvas) {
				self.processCanvas(node);
			} else if (node.qr) {
				self.processQr(node);
			} else if (!node._span) {
				throw `Unrecognized document structure: ${JSON.stringify(node, fontStringify)}`;
			}

			if (absPosition || relPosition) {
				self.writer.context().endDetachedBlock();
			}

			if (unbreakable) {
				self.writer.commitUnbreakableBlock();
			}
		});

		function applyMargins(callback) {
			let margin = node._margin;

			if (node.pageBreak === 'before') {
				self.writer.moveToNextPage(node.pageOrientation);
			}

			if (margin) {
				self.writer.context().moveDown(margin[1]);
				self.writer.context().addMargin(margin[0], margin[2]);
			}

			callback();

			if (margin) {
				self.writer.context().addMargin(-margin[0], -margin[2]);
				self.writer.context().moveDown(margin[3]);
			}

			if (node.pageBreak === 'after') {
				self.writer.moveToNextPage(node.pageOrientation);
			}
		}
	}

	// vertical container
	processVerticalContainer(node) {
		var self = this;
		node.stack.forEach(item => {
			self.processNode(item);
			addAll(node.positions, item.positions);

			//TODO: paragraph gap
		});
	}

	// columns
	processColumns(columnNode) {
		let columns = columnNode.columns;
		let availableWidth = this.writer.context().availableWidth;
		let gaps = gapArray(columnNode._gap);

		if (gaps) {
			availableWidth -= (gaps.length - 1) * columnNode._gap;
		}

		ColumnCalculator.buildColumnWidths(columns, availableWidth);
		let result = this.processRow(columns, columns, gaps);
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
	}

	processRow(columns, widths, gaps, tableBody, tableRow, height) {
		var self = this;
		let pageBreaks = [];
		let positions = [];

		this.tracker.auto('pageChanged', storePageBreakData, () => {
			widths = widths || columns;

			self.writer.context().beginColumnGroup();

			for (let i = 0, l = columns.length; i < l; i++) {
				let column = columns[i];
				let width = widths[i]._calcWidth;
				let leftOffset = colLeftOffset(i);

				if (column.colSpan && column.colSpan > 1) {
					for (let j = 1; j < column.colSpan; j++) {
						width += widths[++i]._calcWidth + gaps[i];
					}
				}

				self.writer.context().beginColumn(width, leftOffset, getEndingCell(column, i));
				if (!column._span) {
					self.processNode(column);
					addAll(positions, column.positions);
				} else if (column._columnEndingContext) {
					// row-span ending
					self.writer.context().markEnding(column);
				}
			}

			self.writer.context().completeColumnGroup(height);
		});

		return {pageBreaks: pageBreaks, positions: positions};

		function storePageBreakData(data) {
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
		}

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
					throw `Row span for column ${columnIndex} (with indexes starting from 0) exceeded row count`;
				}
				return tableBody[endingRow][columnIndex];
			}

			return null;
		}
	}

	// lists
	processList(orderedList, node) {
		var self = this;
		let items = orderedList ? node.ol : node.ul;
		let gapSize = node._gapSize;

		this.writer.context().addMargin(gapSize.width);

		let nextMarker;
		this.tracker.auto('lineAdded', addMarkerToFirstLeaf, () => {
			items.forEach(item => {
				nextMarker = item.listMarker;
				self.processNode(item);
				addAll(node.positions, item.positions);
			});
		});

		this.writer.context().addMargin(-gapSize.width);

		function addMarkerToFirstLeaf(line) {
			// I'm not very happy with the way list processing is implemented
			// (both code and algorithm should be rethinked)
			if (nextMarker) {
				let marker = nextMarker;
				nextMarker = null;

				if (marker.canvas) {
					let vector = marker.canvas[0];

					offsetVector(vector, -marker._minWidth, 0);
					self.writer.addVector(vector);
				} else if (marker._inlines) {
					let markerLine = new Line(self.pageSize.width);
					markerLine.addInline(marker._inlines[0]);
					markerLine.x = -marker._minWidth;
					markerLine.y = line.getAscenderHeight() - markerLine.getAscenderHeight();
					self.writer.addLine(markerLine, true);
				}
			}
		}
	}

	// tables
	processTable(tableNode) {
		let processor = new TableProcessor(tableNode);

		processor.beginTable(this.writer);

		let rowHeights = tableNode.table.heights;
		for (let i = 0, l = tableNode.table.body.length; i < l; i++) {
			processor.beginRow(i, this.writer);

			let height;
			if (isFunction(rowHeights)) {
				height = rowHeights(i);
			} else if (isArray(rowHeights)) {
				height = rowHeights[i];
			} else {
				height = rowHeights;
			}

			if (height === 'auto') {
				height = undefined;
			}

			let result = this.processRow(tableNode.table.body[i], tableNode.table.widths, tableNode._offsets.offsets, tableNode.table.body, i, height);
			addAll(tableNode.positions, result.positions);

			processor.endRow(i, this.writer, result.pageBreaks);
		}

		processor.endTable(this.writer);
	}

	// leafs (texts)
	processLeaf(node) {
		let line = this.buildNextLine(node);
		let currentHeight = (line) ? line.getHeight() : 0;
		let maxHeight = node.maxHeight || -1;

		if (node._tocItemRef) {
			line._pageNodeRef = node._tocItemRef;
		}

		if (node._pageRef) {
			line._pageNodeRef = node._pageRef._nodeRef;
		}

		if (line && line.inlines && isArray(line.inlines)) {
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
		this.processNode(node.toc._table);
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

		// ...

		return line;
	}

	// images
	processImage(node) {
		let position = this.writer.addImage(node);
		node.positions.push(position);
	}

	processCanvas(node) {
		let height = node._minHeight;

		if (node.absolutePosition === undefined && this.writer.context().availableHeight < height) {
			// TODO: support for canvas larger than a page
			// TODO: support for other overflow methods

			this.writer.moveToNextPage();
		}

		this.writer.alignCanvas(node);

		node.canvas.forEach(function (vector) {
			let position = this.writer.addVector(vector);
			node.positions.push(position);
		}, this);

		this.writer.context().moveDown(height);
	}

	processQr(node) {
		let position = this.writer.addQr(node);
		node.positions.push(position);
	}
}

function decorateNode(node) {
	let x = node.x;
	let y = node.y;
	node.positions = [];

	if (isArray(node.canvas)) {
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
		if (isArray(node.canvas)) {
			node.canvas.forEach(vector => {
				vector.resetXY();
			});
		}
	};
}

export default LayoutBuilder;
