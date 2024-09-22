'use strict';

var TraversalTracker = require('./traversalTracker');
var DocPreprocessor = require('./docPreprocessor');
var DocMeasure = require('./docMeasure');
var DocumentContext = require('./documentContext');
var PageElementWriter = require('./pageElementWriter');
var ColumnCalculator = require('./columnCalculator');
var TableProcessor = require('./tableProcessor');
var Line = require('./line');
var isString = require('./helpers').isString;
var isArray = require('./helpers').isArray;
var isUndefined = require('./helpers').isUndefined;
var isNull = require('./helpers').isNull;
var pack = require('./helpers').pack;
var offsetVector = require('./helpers').offsetVector;
var fontStringify = require('./helpers').fontStringify;
var getNodeId = require('./helpers').getNodeId;
var isFunction = require('./helpers').isFunction;
var TextTools = require('./textTools');
var StyleContextStack = require('./styleContextStack');
var isNumber = require('./helpers').isNumber;

function addAll(target, otherArray) {
	otherArray.forEach(function (item) {
		target.push(item);
	});
}

/**
 * Creates an instance of LayoutBuilder - layout engine which turns document-definition-object
 * into a set of pages, lines, inlines and vectors ready to be rendered into a PDF
 *
 * @param {Object} pageSize - an object defining page width and height
 * @param {Object} pageMargins - an object defining top, left, right and bottom margins
 */
function LayoutBuilder(pageSize, pageMargins, imageMeasure, svgMeasure) {
	this.pageSize = pageSize;
	this.pageMargins = pageMargins;
	this.tracker = new TraversalTracker();
	this.imageMeasure = imageMeasure;
	this.svgMeasure = svgMeasure;
	this.tableLayouts = {};
	this.nestedLevel = 0;
}

LayoutBuilder.prototype.registerTableLayouts = function (tableLayouts) {
	this.tableLayouts = pack(this.tableLayouts, tableLayouts);
};

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
LayoutBuilder.prototype.layoutDocument = function (docStructure, fontProvider, styleDictionary, defaultStyle, background, header, footer, images, watermark, pageBreakBeforeFct) {

	function addPageBreaksIfNecessary(linearNodeList, pages) {

		if (!isFunction(pageBreakBeforeFct)) {
			return false;
		}

		linearNodeList = linearNodeList.filter(function (node) {
			return node.positions.length > 0;
		});

		linearNodeList.forEach(function (node) {
			var nodeInfo = {};
			[
				'id', 'text', 'ul', 'ol', 'table', 'image', 'qr', 'canvas', 'svg', 'columns',
				'headlineLevel', 'style', 'pageBreak', 'pageOrientation',
				'width', 'height'
			].forEach(function (key) {
				if (node[key] !== undefined) {
					nodeInfo[key] = node[key];
				}
			});
			nodeInfo.startPosition = node.positions[0];
			nodeInfo.pageNumbers = Array.from(new Set(node.positions.map(function (node) { return node.pageNumber; })));
			nodeInfo.pages = pages.length;
			nodeInfo.stack = isArray(node.stack);

			node.nodeInfo = nodeInfo;
		});

		for (var index = 0; index < linearNodeList.length; index++) {
			var node = linearNodeList[index];
			if (node.pageBreak !== 'before' && !node.pageBreakCalculated) {
				node.pageBreakCalculated = true;
				var pageNumber = node.nodeInfo.pageNumbers[0];
				var followingNodesOnPage = [];
				var nodesOnNextPage = [];
				var previousNodesOnPage = [];
				if (pageBreakBeforeFct.length > 1) {
					for (var ii = index + 1, l = linearNodeList.length; ii < l; ii++) {
						if (linearNodeList[ii].nodeInfo.pageNumbers.indexOf(pageNumber) > -1) {
							followingNodesOnPage.push(linearNodeList[ii].nodeInfo);
						}
						if (pageBreakBeforeFct.length > 2 && linearNodeList[ii].nodeInfo.pageNumbers.indexOf(pageNumber + 1) > -1) {
							nodesOnNextPage.push(linearNodeList[ii].nodeInfo);
						}
					}
				}
				if (pageBreakBeforeFct.length > 3) {
					for (var ii = 0; ii < index; ii++) {
						if (linearNodeList[ii].nodeInfo.pageNumbers.indexOf(pageNumber) > -1) {
							previousNodesOnPage.push(linearNodeList[ii].nodeInfo);
						}
					}
				}
				if (pageBreakBeforeFct(node.nodeInfo, followingNodesOnPage, nodesOnNextPage, previousNodesOnPage)) {
					node.pageBreak = 'before';
					return true;
				}
			}
		}

		return false;
	}

	this.docPreprocessor = new DocPreprocessor();
	this.docMeasure = new DocMeasure(fontProvider, styleDictionary, defaultStyle, this.imageMeasure, this.svgMeasure, this.tableLayouts, images);


	function resetXYs(result) {
		result.linearNodeList.forEach(function (node) {
			node.resetXY();
		});
	}

	var result = this.tryLayoutDocument(docStructure, fontProvider, styleDictionary, defaultStyle, background, header, footer, images, watermark);
	while (addPageBreaksIfNecessary(result.linearNodeList, result.pages)) {
		resetXYs(result);
		result = this.tryLayoutDocument(docStructure, fontProvider, styleDictionary, defaultStyle, background, header, footer, images, watermark);
	}

	return result.pages;
};

LayoutBuilder.prototype.tryLayoutDocument = function (docStructure, fontProvider, styleDictionary, defaultStyle, background, header, footer, images, watermark, pageBreakBeforeFct) {

	this.linearNodeList = [];
	docStructure = this.docPreprocessor.preprocessDocument(docStructure);
	docStructure = this.docMeasure.measureDocument(docStructure);

	this.writer = new PageElementWriter(
		new DocumentContext(this.pageSize, this.pageMargins), this.tracker);

	var _this = this;
	this.writer.context().tracker.startTracking('pageAdded', function () {
		_this.addBackground(background);
	});

	this.addBackground(background);
	this.processNode(docStructure);
	this.addHeadersAndFooters(header, footer);
	if (watermark != null) {
		this.addWatermark(watermark, fontProvider, defaultStyle);
	}

	return { pages: this.writer.context().pages, linearNodeList: this.linearNodeList };
};


LayoutBuilder.prototype.addBackground = function (background) {
	var backgroundGetter = isFunction(background) ? background : function () {
		return background;
	};

	var context = this.writer.context();
	var pageSize = context.getCurrentPage().pageSize;

	var pageBackground = backgroundGetter(context.page + 1, pageSize);

	if (pageBackground) {
		this.writer.beginUnbreakableBlock(pageSize.width, pageSize.height);
		pageBackground = this.docPreprocessor.preprocessDocument(pageBackground);
		this.processNode(this.docMeasure.measureDocument(pageBackground));
		this.writer.commitUnbreakableBlock(0, 0);
		context.backgroundLength[context.page] += pageBackground.positions.length;
	}
};

LayoutBuilder.prototype.addStaticRepeatable = function (headerOrFooter, sizeFunction) {
	this.addDynamicRepeatable(function () {
		return JSON.parse(JSON.stringify(headerOrFooter)); // copy to new object
	}, sizeFunction);
};

LayoutBuilder.prototype.addDynamicRepeatable = function (nodeGetter, sizeFunction) {
	var pages = this.writer.context().pages;

	for (var pageIndex = 0, l = pages.length; pageIndex < l; pageIndex++) {
		this.writer.context().page = pageIndex;

		var node = nodeGetter(pageIndex + 1, l, this.writer.context().pages[pageIndex].pageSize);

		if (node) {
			var sizes = sizeFunction(this.writer.context().getCurrentPage().pageSize, this.pageMargins);
			this.writer.beginUnbreakableBlock(sizes.width, sizes.height);
			node = this.docPreprocessor.preprocessDocument(node);
			this.processNode(this.docMeasure.measureDocument(node));
			this.writer.commitUnbreakableBlock(sizes.x, sizes.y);
		}
	}
};

LayoutBuilder.prototype.addHeadersAndFooters = function (header, footer) {
	var headerSizeFct = function (pageSize, pageMargins) {
		return {
			x: 0,
			y: 0,
			width: pageSize.width,
			height: pageMargins.top
		};
	};

	var footerSizeFct = function (pageSize, pageMargins) {
		return {
			x: 0,
			y: pageSize.height - pageMargins.bottom,
			width: pageSize.width,
			height: pageMargins.bottom
		};
	};

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
};

LayoutBuilder.prototype.addWatermark = function (watermark, fontProvider, defaultStyle) {
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
	watermark.angle = !isUndefined(watermark.angle) && !isNull(watermark.angle) ? watermark.angle : null;

	if (watermark.angle === null) {
		watermark.angle = Math.atan2(this.pageSize.height, this.pageSize.width) * -180 / Math.PI;
	}

	if (watermark.fontSize === 'auto') {
		watermark.fontSize = getWatermarkFontSize(this.pageSize, watermark, fontProvider);
	}

	var watermarkObject = {
		text: watermark.text,
		font: fontProvider.provideFont(watermark.font, watermark.bold, watermark.italics),
		fontSize: watermark.fontSize,
		color: watermark.color,
		opacity: watermark.opacity,
		angle: watermark.angle
	};

	watermarkObject._size = getWatermarkSize(watermark, fontProvider);

	var pages = this.writer.context().pages;
	for (var i = 0, l = pages.length; i < l; i++) {
		pages[i].watermark = watermarkObject;
	}

	function getWatermarkSize(watermark, fontProvider) {
		var textTools = new TextTools(fontProvider);
		var styleContextStack = new StyleContextStack(null, { font: watermark.font, bold: watermark.bold, italics: watermark.italics });

		styleContextStack.push({
			fontSize: watermark.fontSize
		});

		var size = textTools.sizeOfString(watermark.text, styleContextStack);
		var rotatedSize = textTools.sizeOfRotatedText(watermark.text, watermark.angle, styleContextStack);

		return { size: size, rotatedSize: rotatedSize };
	}

	function getWatermarkFontSize(pageSize, watermark, fontProvider) {
		var textTools = new TextTools(fontProvider);
		var styleContextStack = new StyleContextStack(null, { font: watermark.font, bold: watermark.bold, italics: watermark.italics });
		var rotatedSize;

		/**
		 * Binary search the best font size.
		 * Initial bounds [0, 1000]
		 * Break when range < 1
		 */
		var a = 0;
		var b = 1000;
		var c = (a + b) / 2;
		while (Math.abs(a - b) > 1) {
			styleContextStack.push({
				fontSize: c
			});
			rotatedSize = textTools.sizeOfRotatedText(watermark.text, watermark.angle, styleContextStack);
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
};

function decorateNode(node) {
	var x = node.x, y = node.y;
	node.positions = [];

	if (isArray(node.canvas)) {
		node.canvas.forEach(function (vector) {
			var x = vector.x, y = vector.y, x1 = vector.x1, y1 = vector.y1, x2 = vector.x2, y2 = vector.y2;
			vector.resetXY = function () {
				vector.x = x;
				vector.y = y;
				vector.x1 = x1;
				vector.y1 = y1;
				vector.x2 = x2;
				vector.y2 = y2;
			};
		});
	}

	node.resetXY = function () {
		node.x = x;
		node.y = y;
		if (isArray(node.canvas)) {
			node.canvas.forEach(function (vector) {
				vector.resetXY();
			});
		}
	};
}

LayoutBuilder.prototype.processNode = function (node) {
	var self = this;

	this.linearNodeList.push(node);
	decorateNode(node);

	applyMargins(function () {
		var unbreakable = node.unbreakable;
		if (unbreakable) {
			self.writer.beginUnbreakableBlock();
		}

		var absPosition = node.absolutePosition;
		if (absPosition) {
			self.writer.context().beginDetachedBlock();
			self.writer.context().moveTo(absPosition.x || 0, absPosition.y || 0);
		}

		var relPosition = node.relativePosition;
		if (relPosition) {
			self.writer.context().beginDetachedBlock();
			self.writer.context().moveToRelative(relPosition.x || 0, relPosition.y || 0);
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
		} else if (node.svg) {
			self.processSVG(node);
		} else if (node.canvas) {
			self.processCanvas(node);
		} else if (node.qr) {
			self.processQr(node);
		} else if (!node._span) {
			throw 'Unrecognized document structure: ' + JSON.stringify(node, fontStringify);
		}

		if (absPosition || relPosition) {
			self.writer.context().endDetachedBlock();
		}

		if (unbreakable) {
			self.writer.commitUnbreakableBlock();
		}
	});

	function applyMargins(callback) {
		var margin = node._margin;

		if (node.pageBreak === 'before') {
			self.writer.moveToNextPage(node.pageOrientation);
		} else if (node.pageBreak === 'beforeOdd') {
			self.writer.moveToNextPage(node.pageOrientation);
			if ((self.writer.context().page + 1) % 2 === 1) {
				self.writer.moveToNextPage(node.pageOrientation);
			}
		} else if (node.pageBreak === 'beforeEven') {
			self.writer.moveToNextPage(node.pageOrientation);
			if ((self.writer.context().page + 1) % 2 === 0) {
				self.writer.moveToNextPage(node.pageOrientation);
			}
		}

		const isDetachedBlock = node.relativePosition || node.absolutePosition;

		// Detached nodes have no margins, their position is only determined by 'x' and 'y'
		if (margin && !isDetachedBlock) {
			const availableHeight = self.writer.context().availableHeight;
			// If top margin is bigger than available space, move to next page
			// Necessary for nodes inside tables
			if (availableHeight - margin[1] < 0) {
				// Consume the whole available space
				self.writer.context().moveDown(availableHeight);
				self.writer.moveToNextPage(node.pageOrientation);
				/**
				 * TODO - Something to consider:
				 * Right now the node starts at the top of next page (after header)
				 * Another option would be to apply just the top margin that has not been consumed in the page before
				 * It would something like: this.write.context().moveDown(margin[1] - availableHeight)
				 */
			} else {
				self.writer.context().moveDown(margin[1]);
			}

			// Apply lateral margins
			self.writer.context().addMargin(margin[0], margin[2]);
		}

		callback();

		// Detached nodes have no margins, their position is only determined by 'x' and 'y'
		if (margin && !isDetachedBlock) {
			const availableHeight = self.writer.context().availableHeight;
			// If bottom margin is bigger than available space, move to next page
			// Necessary for nodes inside tables
			if (availableHeight - margin[3] < 0) {
				self.writer.context().moveDown(availableHeight);
				self.writer.moveToNextPage(node.pageOrientation);
				/**
				 * TODO - Something to consider:
				 * Right now next node starts at the top of next page (after header)
				 * Another option would be to apply the bottom margin that has not been consumed in the next page?
				 * It would something like: this.write.context().moveDown(margin[3] - availableHeight)
				 */
			} else {
				self.writer.context().moveDown(margin[3]);
			}

			// Apply lateral margins
			self.writer.context().addMargin(-margin[0], -margin[2]);
		}

		if (node.pageBreak === 'after') {
			self.writer.moveToNextPage(node.pageOrientation);
		} else if (node.pageBreak === 'afterOdd') {
			self.writer.moveToNextPage(node.pageOrientation);
			if ((self.writer.context().page + 1) % 2 === 1) {
				self.writer.moveToNextPage(node.pageOrientation);
			}
		} else if (node.pageBreak === 'afterEven') {
			self.writer.moveToNextPage(node.pageOrientation);
			if ((self.writer.context().page + 1) % 2 === 0) {
				self.writer.moveToNextPage(node.pageOrientation);
			}
		}
	}
};

// vertical container
LayoutBuilder.prototype.processVerticalContainer = function (node) {
	var self = this;
	node.stack.forEach(function (item) {
		self.processNode(item);
		addAll(node.positions, item.positions);

		//TODO: paragraph gap
	});
};

// columns
LayoutBuilder.prototype.processColumns = function (columnNode) {
	this.nestedLevel++;
	var columns = columnNode.columns;
	var availableWidth = this.writer.context().availableWidth;
	var gaps = gapArray(columnNode._gap);

	if (gaps) {
		availableWidth -= (gaps.length - 1) * columnNode._gap;
	}

	ColumnCalculator.buildColumnWidths(columns, availableWidth);
	var result = this.processRow({
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

		var gaps = [];
		gaps.push(0);

		for (var i = columns.length - 1; i > 0; i--) {
			gaps.push(gap);
		}

		return gaps;
	}
};

LayoutBuilder.prototype.findStartingSpanCell = function (arr, i) {
	var requiredColspan = 1;
	for (var index = i - 1; index >= 0; index--) {
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
};

LayoutBuilder.prototype.processRow = function ({ marginX = [0, 0], dontBreakRows = false, rowsWithoutPageBreak = 0, cells, widths, gaps, tableBody, rowIndex, height }) {
	var self = this;
	var isUnbreakableRow = dontBreakRows || rowIndex <= rowsWithoutPageBreak - 1;
	var pageBreaks = [];
	var positions = [];
	var willBreakByHeight = false;

	this.tracker.auto('pageChanged', storePageBreakData, function () {
		// Check if row should break by height
		if (!isUnbreakableRow && height > self.writer.context().availableHeight) {
			willBreakByHeight = true;
		}

		widths = widths || cells;
		// Use the marginX if we are in a top level table/column (not nested)
		const marginXParent = self.nestedLevel === 1 ? marginX : null;

		self.writer.context().beginColumnGroup(marginXParent);

		for (var i = 0, l = cells.length; i < l; i++) {
			var column = cells[i];
			var width = widths[i]._calcWidth;
			var leftOffset = colLeftOffset(i);

			if (column.colSpan && column.colSpan > 1) {
				for (var j = 1; j < column.colSpan; j++) {
					width += widths[++i]._calcWidth + gaps[i];
				}
			}

			// if rowspan starts in this cell, we retrieve the last cell affected by the rowspan
			var endingCell = getEndingCell(column, i);
			if (endingCell) {
				// We store a reference of the ending cell in the first cell of the rowspan
				column._endingCell = endingCell;
				column._endingCell._startingRowSpanY = column._startingRowSpanY;
			}

			// Check if exists and retrieve the cell that started the rowspan in case we are in the cell just after
			var startingSpanCell = self.findStartingSpanCell(cells, i);
			var endingSpanCell = null;
			if (startingSpanCell && startingSpanCell._endingCell) {
				// Reference to the last cell of the rowspan
				endingSpanCell = startingSpanCell._endingCell;
				// Store if we are in an unbreakable block when we save the context and the originalX
				if (self.writer.transactionLevel > 0) {
					endingSpanCell._isUnbreakableContext = true;
					endingSpanCell._originalXOffset = self.writer.originalX;
				}
			}

			// We pass the endingSpanCell reference to store the context just after processing rowspan cell
			self.writer.context().beginColumn(width, leftOffset, endingSpanCell);

			if (!column._span) {
				self.processNode(column);
				addAll(positions, column.positions);
			} else if (column._columnEndingContext) {
				var discountY = 0;
				if (dontBreakRows) {
					// Calculate how many points we have to discount to Y when dontBreakRows and rowSpan are combined
					const ctxBeforeRowSpanLastRow = self.writer.contextStack[self.writer.contextStack.length - 1];
					discountY = ctxBeforeRowSpanLastRow.y - column._startingRowSpanY;
				}
				var originalXOffset = 0;
				// If context was saved from an unbreakable block and we are not in an unbreakable block anymore
				// We have to sum the originalX (X before starting unbreakable block) to X
				if (column._isUnbreakableContext && !self.writer.transactionLevel) {
					originalXOffset = column._originalXOffset;
				}
				// row-span ending
				// Recover the context after processing the rowspanned cell
				self.writer.context().markEnding(column, originalXOffset, discountY);
			}
		}

		// Check if last cell is part of a span
		var endingSpanCell = null;
		var lastColumn = cells.length > 0 ? cells[cells.length - 1] : null;
		if (lastColumn) {
			// Previous column cell has a rowspan
			if (lastColumn._endingCell) {
				endingSpanCell = lastColumn._endingCell;
				// Previous column cell is part of a span
			} else if (lastColumn._span === true) {
				// We get the cell that started the span where we set a reference to the ending cell
				var startingSpanCell = self.findStartingSpanCell(cells, cells.length);
				if (startingSpanCell) {
					// Context will be stored here (ending cell)
					endingSpanCell = startingSpanCell._endingCell;
					// Store if we are in an unbreakable block when we save the context and the originalX
					if (self.writer.transactionLevel > 0) {
						endingSpanCell._isUnbreakableContext = true;
						endingSpanCell._originalXOffset = self.writer.originalX;
					}
				}
			}
		}

		// If there are page breaks in this row, update data with prevY of last cell
		updatePageBreakData(self.writer.context().page, self.writer.context().y);

		// If content did not break page, check if we should break by height
		if (!isUnbreakableRow && pageBreaks.length === 0 && willBreakByHeight) {
			self.writer.context().moveDown(self.writer.context().availableHeight);
			self.writer.moveToNextPage();
		}

		self.writer.context().completeColumnGroup(height, endingSpanCell);
	});

	return { pageBreaks: pageBreaks, positions: positions };

	function updatePageBreakData(page, prevY) {
		var pageDesc;
		// Find page break data for this row and page
		for (var i = 0, l = pageBreaks.length; i < l; i++) {
			var desc = pageBreaks[i];
			if (desc.prevPage === page) {
				pageDesc = desc;
				break;
			}
		}
		// If row has page break in this page, update prevY
		if (pageDesc) {
			pageDesc.prevY = Math.max(pageDesc.prevY, prevY);
		}
	}

	function storePageBreakData(data) {
		var pageDesc;

		for (var i = 0, l = pageBreaks.length; i < l; i++) {
			var desc = pageBreaks[i];
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
			var endingRow = rowIndex + column.rowSpan - 1;
			if (endingRow >= tableBody.length) {
				throw 'Row span for column ' + columnIndex + ' (with indexes starting from 0) exceeded row count';
			}
			return tableBody[endingRow][columnIndex];
		}

		return null;
	}
};

// lists
LayoutBuilder.prototype.processList = function (orderedList, node) {
	var self = this,
		items = orderedList ? node.ol : node.ul,
		gapSize = node._gapSize;

	this.writer.context().addMargin(gapSize.width);

	var nextMarker;
	this.tracker.auto('lineAdded', addMarkerToFirstLeaf, function () {
		items.forEach(function (item) {
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
			var marker = nextMarker;
			nextMarker = null;

			if (marker.canvas) {
				var vector = marker.canvas[0];

				offsetVector(vector, -marker._minWidth, 0);
				self.writer.addVector(vector);
			} else if (marker._inlines) {
				var markerLine = new Line(self.pageSize.width);
				markerLine.addInline(marker._inlines[0]);
				markerLine.x = -marker._minWidth;
				markerLine.y = line.getAscenderHeight() - markerLine.getAscenderHeight();
				self.writer.addLine(markerLine, true);
			}
		}
	}
};

// tables
LayoutBuilder.prototype.processTable = function (tableNode) {
	this.nestedLevel++;
	var processor = new TableProcessor(tableNode);

	processor.beginTable(this.writer);

	var rowHeights = tableNode.table.heights;
	for (var i = 0, l = tableNode.table.body.length; i < l; i++) {
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

		var height;
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

		var result = this.processRow({
			marginX: tableNode._margin ? [tableNode._margin[0], tableNode._margin[2]] : [0, 0],
			dontBreakRows: processor.dontBreakRows,
			rowsWithoutPageBreak: processor.rowsWithoutPageBreak,
			cells: tableNode.table.body[i],
			widths: tableNode.table.widths,
			gaps: tableNode._offsets.offsets,
			tableBody: tableNode.table.body,
			rowIndex: i,
			height
		});
		addAll(tableNode.positions, result.positions);

		processor.endRow(i, this.writer, result.pageBreaks);
	}

	processor.endTable(this.writer);
	this.nestedLevel--;
	if (this.nestedLevel === 0) {
		this.writer.context().resetMarginXTopParent();
	}
};

// leafs (texts)
LayoutBuilder.prototype.processLeaf = function (node) {
	var line = this.buildNextLine(node);
	if (line && (node.tocItem || node.id)) {
		line._node = node;
	}
	var currentHeight = (line) ? line.getHeight() : 0;
	var maxHeight = node.maxHeight || -1;

	if (line) {
		var nodeId = getNodeId(node);
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

	if (line && line.inlines && isArray(line.inlines)) {
		for (var i = 0, l = line.inlines.length; i < l; i++) {
			if (line.inlines[i]._tocItemRef) {
				line.inlines[i]._pageNodeRef = line.inlines[i]._tocItemRef;
			}

			if (line.inlines[i]._pageRef) {
				line.inlines[i]._pageNodeRef = line.inlines[i]._pageRef._nodeRef;
			}
		}
	}

	while (line && (maxHeight === -1 || currentHeight < maxHeight)) {
		var positions = this.writer.addLine(line);
		node.positions.push(positions);
		line = this.buildNextLine(node);
		if (line) {
			currentHeight += line.getHeight();
		}
	}
};

LayoutBuilder.prototype.processToc = function (node) {
	if (node.toc.title) {
		this.processNode(node.toc.title);
	}
	if (node.toc._table) {
		this.processNode(node.toc._table);
	}
};

LayoutBuilder.prototype.buildNextLine = function (textNode) {

	function cloneInline(inline) {
		var newInline = inline.constructor();
		for (var key in inline) {
			newInline[key] = inline[key];
		}
		return newInline;
	}

	if (!textNode._inlines || textNode._inlines.length === 0) {
		return null;
	}

	var line = new Line(this.writer.context().availableWidth);
	var textTools = new TextTools(null);

	var isForceContinue = false;
	while (textNode._inlines && textNode._inlines.length > 0 &&
		(line.hasEnoughSpaceForInline(textNode._inlines[0], textNode._inlines.slice(1)) || isForceContinue)) {
		var isHardWrap = false;
		var inline = textNode._inlines.shift();
		isForceContinue = false;

		if (!inline.noWrap && inline.text.length > 1 && inline.width > line.getAvailableWidth()) {
			var widthPerChar = inline.width / inline.text.length;
			var maxChars = Math.floor(line.getAvailableWidth() / widthPerChar);
			if (maxChars < 1) {
				maxChars = 1;
			}
			if (maxChars < inline.text.length) {
				var newInline = cloneInline(inline);

				newInline.text = inline.text.substr(maxChars);
				inline.text = inline.text.substr(0, maxChars);

				newInline.width = textTools.widthOfString(newInline.text, newInline.font, newInline.fontSize, newInline.characterSpacing, newInline.fontFeatures);
				inline.width = textTools.widthOfString(inline.text, inline.font, inline.fontSize, inline.characterSpacing, inline.fontFeatures);

				textNode._inlines.unshift(newInline);
				isHardWrap = true;
			}
		}

		line.addInline(inline);

		isForceContinue = inline.noNewLine && !isHardWrap;
	}

	line.lastLineInParagraph = textNode._inlines.length === 0;

	return line;
};

// images
LayoutBuilder.prototype.processImage = function (node) {
	var position = this.writer.addImage(node);
	node.positions.push(position);
};

LayoutBuilder.prototype.processSVG = function (node) {
	var position = this.writer.addSVG(node);
	node.positions.push(position);
};

LayoutBuilder.prototype.processCanvas = function (node) {
	var height = node._minHeight;

	if (node.absolutePosition === undefined && this.writer.context().availableHeight < height) {
		// TODO: support for canvas larger than a page
		// TODO: support for other overflow methods

		this.writer.moveToNextPage();
	}

	this.writer.alignCanvas(node);

	node.canvas.forEach(function (vector) {
		var position = this.writer.addVector(vector);
		node.positions.push(position);
	}, this);

	this.writer.context().moveDown(height);
};

LayoutBuilder.prototype.processQr = function (node) {
	var position = this.writer.addQr(node);
	node.positions.push(position);
};

module.exports = LayoutBuilder;
