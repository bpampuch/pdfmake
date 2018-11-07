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
var pack = require('./helpers').pack;
var offsetVector = require('./helpers').offsetVector;
var fontStringify = require('./helpers').fontStringify;
var isFunction = require('./helpers').isFunction;
var TextTools = require('./textTools');
var StyleContextStack = require('./styleContextStack');

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
function LayoutBuilder(pageSize, pageMargins, imageMeasure) {
	this.pageSize = pageSize;
	this.pageMargins = pageMargins;
	this.tracker = new TraversalTracker();
	this.imageMeasure = imageMeasure;
	this.tableLayouts = {};
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
				'id', 'text', 'ul', 'ol', 'table', 'image', 'qr', 'canvas', 'columns',
				'headlineLevel', 'style', 'pageBreak', 'pageOrientation',
				'width', 'height'
			].forEach(function (key) {
				if (node[key] !== undefined) {
					nodeInfo[key] = node[key];
				}
			});
			nodeInfo.startPosition = node.positions[0];
			nodeInfo.pageNumbers = node.positions.map(function (node) {
				return node.pageNumber;
			}).filter(function (element, position, array) {
				return array.indexOf(element) === position;
			});
			nodeInfo.pages = pages.length;
			nodeInfo.stack = isArray(node.stack);

			node.nodeInfo = nodeInfo;
		});

		return linearNodeList.some(function (node, index, followingNodeList) {
			if (node.pageBreak !== 'before' && !node.pageBreakCalculated) {
				node.pageBreakCalculated = true;
				var pageNumber = node.nodeInfo.pageNumbers[0];

				var followingNodesOnPage = followingNodeList.slice(index + 1).filter(function (node0) {
					return node0.nodeInfo.pageNumbers.indexOf(pageNumber) > -1;
				});

				var nodesOnNextPage = followingNodeList.slice(index + 1).filter(function (node0) {
					return node0.nodeInfo.pageNumbers.indexOf(pageNumber + 1) > -1;
				});

				var previousNodesOnPage = followingNodeList.slice(0, index).filter(function (node0) {
					return node0.nodeInfo.pageNumbers.indexOf(pageNumber) > -1;
				});

				if (
					pageBreakBeforeFct(
						node.nodeInfo,
						followingNodesOnPage.map(function (node) {
							return node.nodeInfo;
						}),
						nodesOnNextPage.map(function (node) {
							return node.nodeInfo;
						}),
						previousNodesOnPage.map(function (node) {
							return node.nodeInfo;
						}))) {
					node.pageBreak = 'before';
					return true;
				}
			}
		});
	}

	this.docPreprocessor = new DocPreprocessor();
	this.docMeasure = new DocMeasure(fontProvider, styleDictionary, defaultStyle, this.imageMeasure, this.tableLayouts, images);


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

	return {pages: this.writer.context().pages, linearNodeList: this.linearNodeList};
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

	var watermarkObject = {
		text: watermark.text,
		font: fontProvider.provideFont(watermark.font, watermark.bold, watermark.italics),
		size: getSize(this.pageSize, watermark, fontProvider),
		color: watermark.color,
		opacity: watermark.opacity
	};

	var pages = this.writer.context().pages;
	for (var i = 0, l = pages.length; i < l; i++) {
		pages[i].watermark = watermarkObject;
	}

	function getSize(pageSize, watermark, fontProvider) {
		var width = pageSize.width;
		var height = pageSize.height;
		var targetWidth = Math.sqrt(width * width + height * height) * 0.8; /* page diagonal * sample factor */
		var textTools = new TextTools(fontProvider);
		var styleContextStack = new StyleContextStack(null, {font: watermark.font, bold: watermark.bold, italics: watermark.italics});
		var size;

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
	var columns = columnNode.columns;
	var availableWidth = this.writer.context().availableWidth;
	var gaps = gapArray(columnNode._gap);

	if (gaps) {
		availableWidth -= (gaps.length - 1) * columnNode._gap;
	}

	ColumnCalculator.buildColumnWidths(columns, availableWidth);
	var result = this.processRow(columns, columns, gaps);
	addAll(columnNode.positions, result.positions);


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

LayoutBuilder.prototype.processRow = function (columns, widths, gaps, tableBody, tableRow, height) {
	var self = this;
	var pageBreaks = [], positions = [];

	this.tracker.auto('pageChanged', storePageBreakData, function () {
		widths = widths || columns;

		self.writer.context().beginColumnGroup();

		for (var i = 0, l = columns.length; i < l; i++) {
			var column = columns[i];
			var width = widths[i]._calcWidth;
			var leftOffset = colLeftOffset(i);

			if (column.colSpan && column.colSpan > 1) {
				for (var j = 1; j < column.colSpan; j++) {
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
			var endingRow = tableRow + column.rowSpan - 1;
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
	var processor = new TableProcessor(tableNode);

	processor.beginTable(this.writer);

	var rowHeights = tableNode.table.heights;
	for (var i = 0, l = tableNode.table.body.length; i < l; i++) {
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

		var result = this.processRow(tableNode.table.body[i], tableNode.table.widths, tableNode._offsets.offsets, tableNode.table.body, i, height);
		addAll(tableNode.positions, result.positions);

		processor.endRow(i, this.writer, result.pageBreaks);
	}

	processor.endTable(this.writer);
};

// leafs (texts)
LayoutBuilder.prototype.processLeaf = function (node) {
	var line = this.buildNextLine(node);
	var currentHeight = (line) ? line.getHeight() : 0;
	var maxHeight = node.maxHeight || -1;

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
	this.processNode(node.toc._table);
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
