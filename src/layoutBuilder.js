/* jslint node: true */
'use strict';

var _ = require('lodash');
var TraversalTracker = require('./traversalTracker');
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

function addAll(target, otherArray){
  _.each(otherArray, function(item){
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

  function addPageBreaksIfNecessary(linearNodeList) {
    _.each(linearNodeList, function(node) {
      var nodeInfo = _.pick(node, ['id', 'headlineLevel', 'text', 'ul', 'ol', 'table', 'image', 'qr', 'canvas', 'columns', 'style', 'pageOrientation']);
      nodeInfo.startPosition = _.first(node.positions);
      nodeInfo.pageNumbers = _.chain(node.positions).map('pageNumber').uniq().value();

      node.nodeInfo = nodeInfo;
    });

    return _.any(linearNodeList, function (node, index, followingNodeList) {

      if (_.isUndefined(node.stack) && node.pageBreak !== 'before') {
        var pageNumber = _.first(node.nodeInfo.pageNumbers);
        var followingNodesOnPage = _.chain(followingNodeList).drop(index + 1).filter(function (node0) {
          return _.contains(node0.nodeInfo.pageNumbers, pageNumber);
        }).value();
        if (pageBreakBeforeFct(node.nodeInfo, _.map(followingNodesOnPage, 'nodeInfo'))) {
          node.pageBreak = 'before';
          return true;
        }
      }
    });
  }

  if(!isFunction(pageBreakBeforeFct)){
    pageBreakBeforeFct = function(){
      return false;
    };
  }

  this.docMeasure = new DocMeasure(fontProvider, styleDictionary, defaultStyle, this.imageMeasure, this.tableLayouts, images);

  var result, reLayout = false;
  do {
    result = this.tryLayoutDocument(docStructure, fontProvider, styleDictionary, defaultStyle, background, header, footer, images, watermark);
    reLayout = addPageBreaksIfNecessary(result.linearNodeList);
  } while (reLayout);

	return result.pages;
};

LayoutBuilder.prototype.tryLayoutDocument = function (docStructure, fontProvider, styleDictionary, defaultStyle, background, header, footer, images, watermark, pageBreakBeforeFct) {

  this.linearNodeList = [];
  docStructure = this.docMeasure.measureDocument(docStructure);

  this.writer = new PageElementWriter(
    new DocumentContext(this.pageSize, this.pageMargins), this.tracker);

  var _this = this;
  this.writer.context().tracker.startTracking('pageAdded', function() {
    _this.addBackground(background);
  });

  this.addBackground(background);
  this.processNode(docStructure);
  this.addHeadersAndFooters(header, footer);
  /* jshint eqnull:true */
  if(watermark != null)
    this.addWatermark(watermark, fontProvider);

  return {pages: this.writer.context().pages, linearNodeList: this.linearNodeList};
};


LayoutBuilder.prototype.addBackground = function(background) {
    var backgroundGetter = isFunction(background) ? background : function() { return background; };
    
    var pageBackground = backgroundGetter(this.writer.context().page + 1);
    
    if (pageBackground) {
      this.writer.beginUnbreakableBlock(this.pageSize.width, this.pageSize.height);
      this.processNode(this.docMeasure.measureDocument(pageBackground));
      this.writer.commitUnbreakableBlock(0, 0);
    }
};

LayoutBuilder.prototype.addStaticRepeatable = function(node, x, y, width, height) {
  var pages = this.writer.context().pages;
  this.writer.context().page = 0;
  
  this.writer.beginUnbreakableBlock(width, height);
  this.processNode(this.docMeasure.measureDocument(node));
  var repeatable = this.writer.currentBlockToRepeatable();
  repeatable.xOffset = x;
  repeatable.yOffset = y;
  this.writer.commitUnbreakableBlock(x, y);
  
  for(var i = 1, l = pages.length; i < l; i++) {
    this.writer.context().page = i;
    this.writer.addFragment(repeatable, true, true, true);
  }
};

LayoutBuilder.prototype.addDynamicRepeatable = function(nodeGetter, x, y, width, height) {
  var pages = this.writer.context().pages;
  
  for(var i = 0, l = pages.length; i < l; i++) {
    this.writer.context().page = i;

    var node = nodeGetter(i + 1, l);

    if (node) {
      this.writer.beginUnbreakableBlock(width, height);
      this.processNode(this.docMeasure.measureDocument(node));
      this.writer.commitUnbreakableBlock(x, y);
    }
  }
};

LayoutBuilder.prototype.addHeadersAndFooters = function(header, footer) {
  if(isFunction(header)) {
    this.addDynamicRepeatable(header, 0, 0, this.pageSize.width, this.pageMargins.top);
  } else if(header) {
    this.addStaticRepeatable(header, 0, 0, this.pageSize.width, this.pageMargins.top);
  }
  
  if(isFunction(footer)) {
    this.addDynamicRepeatable(footer, 0, this.pageSize.height - this.pageMargins.bottom, this.pageSize.width, this.pageMargins.bottom);
  } else if(footer) {
    this.addStaticRepeatable(footer, 0, this.pageSize.height - this.pageMargins.bottom, this.pageSize.width, this.pageMargins.bottom);
  }
};

LayoutBuilder.prototype.addWatermark = function(watermark, fontProvider){
  var defaultFont = Object.getOwnPropertyNames(fontProvider.fonts)[0]; // TODO allow selection of other font
  var watermarkObject = {
    text: watermark,
    font: fontProvider.provideFont(fontProvider[defaultFont], false, false),
    size: getSize(this.pageSize, watermark, fontProvider)
  };

  var pages = this.writer.context().pages;
  for(var i = 0, l = pages.length; i < l; i++) {
    pages[i].watermark = watermarkObject;
  }

  function getSize(pageSize, watermark, fontProvider){
    var width = pageSize.width;
    var height = pageSize.height;
    var targetWidth = Math.sqrt(width*width + height*height)*0.8; /* page diagnoal * sample factor */
    var textTools = new TextTools(fontProvider);
    var styleContextStack = new StyleContextStack();
    var size;

    /**
     * Binary search the best font size.
     * Initial bounds [0, 1000]
     * Break when range < 1
     */
    var a = 0;
    var b = 1000;
    var c = (a+b)/2;
    while(Math.abs(a - b) > 1){
      styleContextStack.push({
        fontSize: c
      });
      size = textTools.sizeOfString(watermark, styleContextStack);
      if(size.width > targetWidth){
        b = c;
        c = (a+b)/2;
      }
      else if(size.width < targetWidth){
        a = c;
        c = (a+b)/2;
      }
      styleContextStack.pop();
    }
    /*
      End binary search
     */
    return {size: size, fontSize: c};
  }
};

LayoutBuilder.prototype.processNode = function(node) {
  var self = this;

  this.linearNodeList.push(node);
  node.positions = [];

  applyMargins(function() {
    if (node.stack) {
      self.processVerticalContainer(node.stack);
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
    } else if (node.image) {
      self.processImage(node);
    } else if (node.canvas) {
      self.processCanvas(node);
    } else if (node.qr) {
      self.processQr(node);
    }else if (!node._span) {
		throw 'Unrecognized document structure: ' + JSON.stringify(node, fontStringify);
		}
	});

	function applyMargins(callback) {
		var margin = node._margin;

    if (node.pageBreak === 'before') {
        self.writer.moveToNextPage();
    }

		if (margin) {
			self.writer.context().moveDown(margin[1]);
			self.writer.context().addMargin(margin[0], margin[2]);
		}

		callback();

		if(margin) {
			self.writer.context().addMargin(-margin[0], -margin[2]);
			self.writer.context().moveDown(margin[3]);
		}

    if (node.pageBreak === 'after') {
        self.writer.moveToNextPage();
    }
	}
};

// vertical container
LayoutBuilder.prototype.processVerticalContainer = function(items) {
	var self = this;
	items.forEach(function(item) {
		self.processNode(item);

		//TODO: paragraph gap
	});
};

// columns
LayoutBuilder.prototype.processColumns = function(columnNode) {
	var columns = columnNode.columns;
	var availableWidth = this.writer.context().availableWidth;
	var gaps = gapArray(columnNode._gap);

	if (gaps) availableWidth -= (gaps.length - 1) * columnNode._gap;

	ColumnCalculator.buildColumnWidths(columns, availableWidth);
	var result = this.processRow(columns, columns, gaps);
    addAll(columnNode.positions, result.positions);


	function gapArray(gap) {
		if (!gap) return null;

		var gaps = [];
		gaps.push(0);

		for(var i = columns.length - 1; i > 0; i--) {
			gaps.push(gap);
		}

		return gaps;
	}
};

LayoutBuilder.prototype.processRow = function(columns, widths, gaps, tableBody, tableRow) {
  var self = this;
  var pageBreaks = [], positions = [];

  this.tracker.auto('pageChanged', storePageBreakData, function() {
    widths = widths || columns;

    self.writer.context().beginColumnGroup();

    for(var i = 0, l = columns.length; i < l; i++) {
      var column = columns[i];
      var width = widths[i]._calcWidth;
      var leftOffset = colLeftOffset(i);

      if (column.colSpan && column.colSpan > 1) {
          for(var j = 1; j < column.colSpan; j++) {
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

    self.writer.context().completeColumnGroup();
  });

  return {pageBreaks: pageBreaks, positions: positions};

  function storePageBreakData(data) {
    var pageDesc;

    for(var i = 0, l = pageBreaks.length; i < l; i++) {
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
		if (gaps && gaps.length > i) return gaps[i];
		return 0;
	}

  function getEndingCell(column, columnIndex) {
    if (column.rowSpan && column.rowSpan > 1) {
      var endingRow = tableRow + column.rowSpan - 1;
      if (endingRow >= tableBody.length) throw 'Row span for column ' + columnIndex + ' (with indexes starting from 0) exceeded row count';
      return tableBody[endingRow][columnIndex];
    }

    return null;
  }
};

// lists
LayoutBuilder.prototype.processList = function(orderedList, node) {
	var self = this,
      items = orderedList ? node.ol : node.ul,
      gapSize = node._gapSize;

	this.writer.context().addMargin(gapSize.width);

	var nextMarker;
	this.tracker.auto('lineAdded', addMarkerToFirstLeaf, function() {
		items.forEach(function(item) {
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
			} else {
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
LayoutBuilder.prototype.processTable = function(tableNode) {
  var processor = new TableProcessor(tableNode);

  processor.beginTable(this.writer);

  for(var i = 0, l = tableNode.table.body.length; i < l; i++) {
    processor.beginRow(i, this.writer);

    var result = this.processRow(tableNode.table.body[i], tableNode.table.widths, tableNode._offsets.offsets, tableNode.table.body, i);
    addAll(tableNode.positions, result.positions);

    processor.endRow(i, this.writer, result.pageBreaks);
  }

  processor.endTable(this.writer);
};

// leafs (texts)
LayoutBuilder.prototype.processLeaf = function(node) {
	var line = this.buildNextLine(node);

	while (line) {
		var positions = this.writer.addLine(line);
    node.positions.push(positions);
		line = this.buildNextLine(node);
	}
};

LayoutBuilder.prototype.buildNextLine = function(textNode) {
	if (!textNode._inlines || textNode._inlines.length === 0) return null;

	var line = new Line(this.writer.context().availableWidth);

	while(textNode._inlines && textNode._inlines.length > 0 && line.hasEnoughSpaceForInline(textNode._inlines[0])) {
		line.addInline(textNode._inlines.shift());
	}

	line.lastLineInParagraph = textNode._inlines.length === 0;
	return line;
};

// images
LayoutBuilder.prototype.processImage = function(node) {
    var position = this.writer.addImage(node);
    node.positions.push(position);
};

LayoutBuilder.prototype.processCanvas = function(node) {
	var height = node._minHeight;

	if (this.writer.context().availableHeight < height) {
		// TODO: support for canvas larger than a page
		// TODO: support for other overflow methods

		this.writer.moveToNextPage();
	}

	node.canvas.forEach(function(vector) {
		var position = this.writer.addVector(vector);
        node.positions.push(position);
	}, this);

	this.writer.context().moveDown(height);
};

LayoutBuilder.prototype.processQr = function(node) {
	var position = this.writer.addQr(node);
    node.positions.push(position);
};


module.exports = LayoutBuilder;
