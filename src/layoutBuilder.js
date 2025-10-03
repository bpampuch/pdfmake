/* jslint node: true */
'use strict';

var _ = require('lodash');
var TraversalTracker = require('./traversalTracker');
var DocPreprocessor = require('./docPreprocessor');
var DocMeasure = require('./docMeasure');
var DocumentContext = require('./documentContext');
var PageElementWriter = require('./pageElementWriter');
var ColumnCalculator = require('./columnCalculator');
var TableProcessor = require('./tableProcessor');
var Line = require('./line');
var pack = require('./helpers').pack;
var offsetVector = require('./helpers').offsetVector;
var fontStringify = require('./helpers').fontStringify;
var isFunction = require('./helpers').isFunction;
var TextTools = require('./textTools');
var StyleContextStack = require('./styleContextStack');

function addAll(target, otherArray) {
	_.each(otherArray, function (item) {
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
	this.verticalAlignItemStack = [];
	this.tableLayouts = {};
	this.heightHeaderAndFooter = {};
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

		linearNodeList = _.reject(linearNodeList, function (node) {
			return _.isEmpty(node.positions);
		});

		_.each(linearNodeList, function (node) {
			var nodeInfo = _.pick(node, [
				'id', 'text', 'ul', 'ol', 'table', 'image', 'qr', 'canvas', 'columns',
				'headlineLevel', 'style', 'pageBreak', 'pageOrientation',
				'width', 'height'
			]);
			nodeInfo.startPosition = _.first(node.positions);
			nodeInfo.pageNumbers = _.chain(node.positions).map('pageNumber').uniq().value();
			nodeInfo.pages = pages.length;
			nodeInfo.stack = _.isArray(node.stack);
			nodeInfo.layers = _.isArray(node.layers);

			node.nodeInfo = nodeInfo;
		});

		return _.some(linearNodeList, function (node, index, followingNodeList) {
			if (node.pageBreak !== 'before' && !node.pageBreakCalculated) {
				node.pageBreakCalculated = true;
				var pageNumber = _.first(node.nodeInfo.pageNumbers);

				var followingNodesOnPage = _.chain(followingNodeList).drop(index + 1).filter(function (node0) {
					return _.includes(node0.nodeInfo.pageNumbers, pageNumber);
				}).value();

				var nodesOnNextPage = _.chain(followingNodeList).drop(index + 1).filter(function (node0) {
					return _.includes(node0.nodeInfo.pageNumbers, pageNumber + 1);
				}).value();

				var previousNodesOnPage = _.chain(followingNodeList).take(index).filter(function (node0) {
					return _.includes(node0.nodeInfo.pageNumbers, pageNumber);
				}).value();

				if (pageBreakBeforeFct(node.nodeInfo,
					_.map(followingNodesOnPage, 'nodeInfo'),
					_.map(nodesOnNextPage, 'nodeInfo'),
					_.map(previousNodesOnPage, 'nodeInfo'))) {
					node.pageBreak = 'before';
					return true;
				}
			}
		});
	}

	this.docPreprocessor = new DocPreprocessor();
	this.docMeasure = new DocMeasure(fontProvider, styleDictionary, defaultStyle, this.imageMeasure, this.tableLayouts, images);


	function resetXYs(result) {
		_.each(result.linearNodeList, function (node) {
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

	//----------get height layout header and footer ^^modify by tak^^------------
	this.linearNodeList = [];
	this.writer = new PageElementWriter(
		new DocumentContext(this.pageSize, this.pageMargins), this.tracker);
	this.heightHeaderAndFooter = this.addHeadersAndFooters(header, footer);

	if(this.heightHeaderAndFooter.header != undefined)
		this.pageMargins.top = this.heightHeaderAndFooter.header +1;
	//----------get height layout header and footer ^^modify by tak^^------------

	//----------Remark Table Page Break by Beam----------
	if (docStructure[2][0]) {
		if (docStructure[2][0].remark) {
			var tableRemark = docStructure[2][0].remark;
			var remarkLabel = docStructure[2][0];
			var remarkDetail = docStructure[2][1].text;

			docStructure[2].splice(0, 1);
			docStructure[2].splice(0, 1);

			var labelRow = [];
			var detailRow = [];

			labelRow.push(remarkLabel);
			detailRow.push({ remarktest: true, text: remarkDetail });

			tableRemark.table.body.push(labelRow);
			tableRemark.table.body.push(detailRow);

			tableRemark.table.headerRows = 1;

			docStructure[2].push(tableRemark);

		}
	}
	//----------Remark Table Page Break by Beam----------

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
	this.addHeadersAndFooters(header, footer, this.heightHeaderAndFooter.header + 1, this.heightHeaderAndFooter.footer + 1);
	/* jshint eqnull:true */
	if (watermark != null) {
		this.addWatermark(watermark, fontProvider, defaultStyle);
	}

	return {pages: this.writer.context().pages, linearNodeList: this.linearNodeList};
};


LayoutBuilder.prototype.addBackground = function (background) {
	var backgroundGetter = isFunction(background) ? background : function () {
		return background;
	};

	var pageBackground = backgroundGetter(this.writer.context().page + 1);

	if (pageBackground) {
		var pageSize = this.writer.context().getCurrentPage().pageSize;
		this.writer.beginUnbreakableBlock(pageSize.width, pageSize.height);
		pageBackground = this.docPreprocessor.preprocessDocument(pageBackground);
		this.processNode(this.docMeasure.measureDocument(pageBackground));
		this.writer.commitUnbreakableBlock(0, 0);
	}
};

LayoutBuilder.prototype.addStaticRepeatable = function (headerOrFooter, sizeFunction) {
	var height = this.addDynamicRepeatable(function () {
		return JSON.parse(JSON.stringify(headerOrFooter)); // copy to new object
	}, sizeFunction);

	return height;
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

	return node._height;
};

LayoutBuilder.prototype.addHeadersAndFooters = function (header, footer, headerHeight, footeHeight) {
	var headerHeight;
	var footeHeight;


	var headerSizeFct = function (pageSize, pageMargins) {
		if(headerHeight == undefined)
			headerHeight = pageSize.height;

		return {
			x: 0,
			y: 0,
			width: pageSize.width,
			height: headerHeight
		};
	};

	var footerSizeFct = function (pageSize, pageMargins) {
		if(footeHeight == undefined)
			footeHeight = pageSize.height;

		return {
			x: 0,
			y: pageSize.height - footeHeight,
			width: pageSize.width,
			height: footeHeight
		};
	};

	//---check availableHeight for add footer last page ^^modify by tak^^---
	/*if(footeHeight != undefined && typeof footeHeight == "number"){
		if(this.writer.context().availableHeight < footeHeight){
			this.writer.moveToNextPage();
		}
	}*/

	if (isFunction(footer)) {
		footeHeight = this.addDynamicRepeatable(footer, footerSizeFct);
	} else if (footer) {
		footeHeight = this.addStaticRepeatable(footer, footerSizeFct);
	}

	if (isFunction(header)) {
		headerHeight = this.addDynamicRepeatable(header, headerSizeFct);
	} else if (header) {
		headerHeight = this.addStaticRepeatable(header, headerSizeFct);
	}

	return { header:headerHeight , footer:footeHeight };
};

LayoutBuilder.prototype.addWatermark = function (watermark, fontProvider, defaultStyle) {
	if (typeof watermark === 'string') {
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

	_.each(node.canvas, function (vector) {
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

	node.resetXY = function () {
		node.x = x;
		node.y = y;
		_.each(node.canvas, function (vector) {
			vector.resetXY();
		});
	};
}

var this_tracker_test;
var this_writer_test;
var this_verticalAlignItemStack_test = [];
var result_test = false;
var filterFooter = -1;
var footerBreak = false;

var processNode_test = function (node) {

	decorateNode(node);

	var prevTop = this_writer_test.context().getCurrentPosition().top;

	applyMargins(function () {
		var unbreakable = node.unbreakable;
		if (unbreakable) {
			this_writer_test.beginUnbreakableBlock();
		}

		var absPosition = node.absolutePosition;
		if (absPosition) {
			this_writer_test.context().beginDetachedBlock();
			this_writer_test.context().moveTo(absPosition.x || 0, absPosition.y || 0);
		}

		var relPosition = node.relativePosition;
		if (relPosition) {
			this_writer_test.context().beginDetachedBlock();
			this_writer_test.context().moveTo((relPosition.x || 0) + self.writer.context().x, (relPosition.y || 0) + self.writer.context().y);
		}

		var verticalAlignBegin;
		if (node.verticalAlign) {
		  verticalAlignBegin = this_writer_test.beginVerticalAlign(node.verticalAlign);
		}

		if (node.stack) {
			processVerticalContainer_test(node);
		} else if (node.table) {
			processTable_test(node);
		} else if (node.text !== undefined) {
			processLeaf_test(node);
		}

		if (absPosition || relPosition) {
			this_writer_test.context().endDetachedBlock();
		}

			if (unbreakable) {
				result_test = this_writer_test.commitUnbreakableBlock_test();
			}

			if (node.verticalAlign) {
				this_verticalAlignItemStack_test.push({ begin: verticalAlignBegin, end: this_writer_test.endVerticalAlign(node.verticalAlign) });
			  }

	});

	// TODO: ugly; does not work (at least) when page break in node
  	node._height = this_writer_test.context().getCurrentPosition().top - prevTop;

	function applyMargins(callback) {
		var margin = node._margin;

		if (node.pageBreak === 'before') {
			this_writer_test.moveToNextPage(node.pageOrientation);
		}

		if (margin) {
			this_writer_test.context().moveDown(margin[1]);
			this_writer_test.context().addMargin(margin[0], margin[2]);
		}

		callback();

		if (margin) {
			this_writer_test.context().addMargin(-margin[0], -margin[2]);
			this_writer_test.context().moveDown(margin[3]);
		}

		if (node.pageBreak === 'after') {
			this_writer_test.moveToNextPage(node.pageOrientation);
		}
	}

}

LayoutBuilder.prototype.processNode = function (node) {
	if(footerBreak && node.footerBreak){return;}
	var self = this;
	var unbreakable_test = node.unbreakable;

	if (unbreakable_test) {
		if(node.summary){
			if(node.table.body[0][0].summaryBreak){
				this_tracker_test = new TraversalTracker();
				this_writer_test = new PageElementWriter(self.writer.context(),this_tracker_test);
				this_verticalAlignItemStack_test = self.verticalAlignItemStack.slice();
				var node_test = _.cloneDeep(node);
				node_test.table.body[0].splice(0,1);
				processNode_test(node_test);
				if(result_test){
					node.table.body[0].splice(0,1);
				}
			}
		}
	}

	this.linearNodeList.push(node);
	decorateNode(node);

	var prevTop = self.writer.context().getCurrentPosition().top;

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

		var verticalAlignBegin;
		if (node.verticalAlign) {
		  verticalAlignBegin = self.writer.beginVerticalAlign(node.verticalAlign);
		}

		if (node.stack) {
			self.processVerticalContainer(node);
		} else if (node.layers) {
			self.processLayers(node);
		}  else if (node.columns) {
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

		if ((absPosition || relPosition) && (!node.absoluteRepeatable)) {
			self.writer.context().endDetachedBlock();
		}

			if (unbreakable) {

				if(node.footer){
					footerBreak = self.writer.commitUnbreakableBlock(undefined, undefined, node.footer);
				} else {
					self.writer.commitUnbreakableBlock();
				}
			}

		if (node.verticalAlign) {
			self.verticalAlignItemStack.push({ begin: verticalAlignBegin, end: self.writer.endVerticalAlign(node.verticalAlign) });
		  }

	});

	// TODO: ugly; does not work (at least) when page break in node
  	node._height = self.writer.context().getCurrentPosition().top - prevTop;

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

var processVerticalContainer_test = function (node) {

	node.stack.forEach(function (item) {
		processNode_test(item);
		addAll(node.positions, item.positions);

		//TODO: paragraph gap
	});
};

// layers
LayoutBuilder.prototype.processLayers = function(node) {
	var self = this;
	var ctxX = self.writer.context().x;
	var ctxY = self.writer.context().y;
	var maxX = ctxX;
	var maxY = ctxY;
	node.layers.forEach(function(item, i) {
	  self.writer.context().x = ctxX;
	  self.writer.context().y = ctxY;
	  self.processNode(item);
	  item._verticalAlignIdx = self.verticalAlignItemStack.length - 1;
	  addAll(node.positions, item.positions);
	  maxX = self.writer.context().x > maxX ? self.writer.context().x : maxX;
	  maxY = self.writer.context().y > maxY ? self.writer.context().y : maxY;
	});
	self.writer.context().x = maxX;
	self.writer.context().y = maxY;
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

LayoutBuilder.prototype.processRow = function (columns, widths, gaps, tableBody, tableRow, isRemark, height, heightOffset) {
	var self = this;
	var pageBreaks = [], positions = [];

	this.tracker.auto('pageChanged', storePageBreakData, function () {
		widths = widths || columns;

		self.writer.context().beginColumnGroup();

		var verticalAlignCols = {};

		for (var i = 0, l = columns.length; i < l; i++) {
			var column = columns[i];
			var width = widths[i]._calcWidth;
			var leftOffset = colLeftOffset(i);
			var colI = i;
			if (column.colSpan && column.colSpan > 1) {
				for (var j = 1; j < column.colSpan; j++) {
					width += widths[++i]._calcWidth + gaps[i];
				}
			}

			self.writer.context().beginColumn(width, leftOffset, getEndingCell(column, i), heightOffset);

			if (!column._span) {
				self.processNode(column);
				verticalAlignCols[colI] = self.verticalAlignItemStack.length - 1;
				addAll(positions, column.positions);
			} else if (column._columnEndingContext) {
				// row-span ending
				self.writer.context().markEnding(column);
			}
		}

		self.writer.context().completeColumnGroup(height);

		var rowHeight = self.writer.context().height;
		for(var i = 0, l = columns.length; i < l; i++) {
		  var column = columns[i];
		  if (column._span) continue;
		  if (column.verticalAlign) {
			var item = self.verticalAlignItemStack[verticalAlignCols[i]].begin.item;
			item.viewHeight = rowHeight;
			item.nodeHeight = column._height;
		  }
		  if (column.layers) {
			column.layers.forEach(function(layer) {
			  if(layer.verticalAlign) {
				var item = self.verticalAlignItemStack[layer._verticalAlignIdx].begin.item;
				item.viewHeight = rowHeight;
				item.nodeHeight = layer._height;
			  }
			});
		  }
		}
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

	function verticalAlignLayer(layer) {
		if(layer.verticalAlign) {
		  var item = self.verticalAlignItemStack[layer._verticalAlignIdx].begin.item;
		  item.viewHeight = self.writer.context().height;
		  item.nodeHeight = layer._height;
		}
	  }
};

var processRow_test = function (columns, widths, gaps, tableBody, tableRow, isRemark) {
	var pageBreaks = [], positions = [];

	this_tracker_test.auto('pageChanged', storePageBreakData, function () {
		widths = widths || columns;

		this_writer_test.context().beginColumnGroup();

		var verticalAlignCols = {};

		for (var i = 0, l = columns.length; i < l; i++) {
			var column = columns[i];
			var width = widths[i]._calcWidth;
			var leftOffset = colLeftOffset(i);
			var colI = i;
			if (column.colSpan && column.colSpan > 1) {
				for (var j = 1; j < column.colSpan; j++) {
					width += widths[++i]._calcWidth + gaps[i];
				}
			}

			this_writer_test.context().beginColumn(width, leftOffset, getEndingCell(column, i));

			if (!column._span) {
				processNode_test(column);
				verticalAlignCols[colI] = this_verticalAlignItemStack_test.length - 1;
				addAll(positions, column.positions);
			} else if (column._columnEndingContext) {
				// row-span ending
				this_writer_test.context().markEnding(column);
			}
		}

		this_writer_test.context().completeColumnGroup();

		var rowHeight = this_writer_test.context().height;
		for(var i = 0, l = columns.length; i < l; i++) {
		  var column = columns[i];
		  if (column._span) continue;
		  if (column.verticalAlign) {
			var item = this_verticalAlignItemStack_test[verticalAlignCols[i]].begin.item;
			item.viewHeight = rowHeight;
			item.nodeHeight = column._height;
		  }
		  if (column.layers) {
			column.layers.forEach(function(layer) {
			  if(layer.verticalAlign) {
				var item = this_verticalAlignItemStack_test[layer._verticalAlignIdx].begin.item;
				item.viewHeight = rowHeight;
				item.nodeHeight = layer._height;
			  }
			});
		  }
		}
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

	function verticalAlignLayer(layer) {
		if(layer.verticalAlign) {
		  var item = this_verticalAlignItemStack_test[layer._verticalAlignIdx].begin.item;
		  item.viewHeight = this_writer_test.context().height;
		  item.nodeHeight = layer._height;
		}
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
		} else if (Array.isArray(rowHeights)) {
			height = rowHeights[i];
		} else {
			height = rowHeights;
		}

		if (height === 'auto') {
			height = undefined;
		}

		var heightOffset = tableNode.heightOffset != undefined ? tableNode.heightOffset : 0;
		
		var result = this.processRow(tableNode.table.body[i], tableNode.table.widths, tableNode._offsets.offsets, tableNode.table.body, i, tableNode.table.remark, height, heightOffset);		
		addAll(tableNode.positions, result.positions);

		//if(tableNode.table.name == 'productItem') console.log(i,result.pageBreaks);

		processor.endRow(i, this.writer, result.pageBreaks);
	}

	processor.endTable(this.writer);
};

// tables
var processTable_test = function (tableNode) {
	var processor = new TableProcessor(tableNode);
	processor.beginTable(this_writer_test);

	for (var i = 0, l = tableNode.table.body.length; i < l; i++) {
		processor.beginRow(i, this_writer_test);

		var result = processRow_test(tableNode.table.body[i], tableNode.table.widths, tableNode._offsets.offsets, tableNode.table.body, i, tableNode.remark);
		addAll(tableNode.positions, result.positions);

		processor.endRow(i, this_writer_test, result.pageBreaks);
	}

	processor.endTable(this_writer_test);
};

// leafs (texts)
LayoutBuilder.prototype.processLeaf = function (node) {

	var line = this.buildNextLine(node);
	var currentHeight = (line) ? line.getHeight() : 0;
	var maxHeight = node.maxHeight || -1;

	if (node._tocItemRef) {
		line._tocItemNode = node._tocItemRef;
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

var processLeaf_test = function (node) {

	var line = buildNextLine_test(node);
	var currentHeight = (line) ? line.getHeight() : 0;
	var maxHeight = node.maxHeight || -1;

	if (node._tocItemRef) {
		line._tocItemNode = node._tocItemRef;
	}

	while (line && (maxHeight === -1 || currentHeight < maxHeight)) {
		var positions = this_writer_test.addLine(line);
		node.positions.push(positions);
		line = buildNextLine_test(node);
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

	while (textNode._inlines && textNode._inlines.length > 0 && line.hasEnoughSpaceForInline(textNode._inlines[0])) {
		var inline = textNode._inlines.shift();

		if (!inline.noWrap && inline.text.length > 1 && inline.width > line.maxWidth) {
			var widthPerChar = inline.width / inline.text.length;
			var maxChars = Math.floor(line.maxWidth / widthPerChar);
			if (maxChars < 1) {
				maxChars = 1;
			}
			if (maxChars < inline.text.length) {
				var newInline = cloneInline(inline);

				newInline.text = inline.text.substr(maxChars);
				inline.text = inline.text.substr(0, maxChars);

				newInline.width = textTools.widthOfString(newInline.text, newInline.font, newInline.fontSize, newInline.characterSpacing);
				inline.width = textTools.widthOfString(inline.text, inline.font, inline.fontSize, inline.characterSpacing);

				textNode._inlines.unshift(newInline);
			}
		}

		line.addInline(inline);
	}

	line.lastLineInParagraph = textNode._inlines.length === 0;

	return line;
};

var buildNextLine_test = function (textNode) {

	function cloneInline_test(inline) {
		var newInline = inline.constructor();
		for (var key in inline) {
			newInline[key] = inline[key];
		}
		return newInline;
	}

	if (!textNode._inlines || textNode._inlines.length === 0) {
		return null;
	}

	var line = new Line(this_writer_test.context().availableWidth);
	var textTools = new TextTools(null);

	while (textNode._inlines && textNode._inlines.length > 0 && line.hasEnoughSpaceForInline(textNode._inlines[0])) {
		var inline = textNode._inlines.shift();

		if (!inline.noWrap && inline.text.length > 1 && inline.width > line.maxWidth) {
			var widthPerChar = inline.width / inline.text.length;
			var maxChars = Math.floor(line.maxWidth / widthPerChar);
			if (maxChars < 1) {
				maxChars = 1;
			}
			if (maxChars < inline.text.length) {
				var newInline = cloneInline_test(inline);

				newInline.text = inline.text.substr(maxChars);
				inline.text = inline.text.substr(0, maxChars);

				newInline.width = textTools.widthOfString(newInline.text, newInline.font, newInline.fontSize, newInline.characterSpacing);
				inline.width = textTools.widthOfString(inline.text, inline.font, inline.fontSize, inline.characterSpacing);

				textNode._inlines.unshift(newInline);
			}
		}

		line.addInline(inline);
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

	if (this.writer.context().availableHeight < height) {
		// TODO: support for canvas larger than a page
		// TODO: support for other overflow methods

		this.writer.moveToNextPage();
	}

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
