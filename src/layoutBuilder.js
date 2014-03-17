/* jslint node: true */
'use strict';

var TraversalTracker = require('./traversalTracker');
var DocMeasure = require('./docMeasure');
var DocumentContext = require('./documentContext');
var PageElementWriter = require('./pageElementWriter');
var ColumnCalculator = require('./columnCalculator');
var Line = require('./line');
var pack = require('./helpers').pack;
var offsetVector = require('./helpers').offsetVector;
var fontStringify = require('./helpers').fontStringify;

/**
 * Creates an instance of LayoutBuilder - layout engine which turns document-definition-object
 * into a set of pages, lines, inlines and vectors ready to be rendered into a PDF
 *
 * @param {Object} pageSize - an object defining page width and height
 * @param {Object} pageMargins - an object defining top, left, right and bottom margins
 */
function LayoutBuilder(pageSize, pageMargins) {
	this.pageSize = pageSize;
	this.pageMargins = pageMargins;
	this.tracker = new TraversalTracker();
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
LayoutBuilder.prototype.layoutDocument = function (docStructure, fontProvider, styleDictionary, defaultStyle) {
	new DocMeasure(fontProvider, styleDictionary, defaultStyle).measureDocument(docStructure);

	this.writer = new PageElementWriter(
		new DocumentContext(this.pageSize, this.pageMargins, true),
		this.tracker);

	this.processNode({ stack: docStructure });

	return this.writer.context.pages;
};

LayoutBuilder.prototype.processNode = function(node) {
	var self = this;

	applyMargins(function() {
		if (node.stack) {
			self.processVerticalContainer(node.stack);
		} else if (node.columns) {
			self.processColumns(node);
		} else if (node.ul) {
			self.processList(false, node.ul, node._gapSize);
		} else if (node.ol) {
			self.processList(true, node.ol, node._gapSize);
		} else if (node.table) {
			self.processTable(node);
		} else if (node.text) {
			self.processLeaf(node);
		} else if (node.canvas) {
			self.processCanvas(node);
		} else {
			throw 'Unrecognized document structure: ' + JSON.stringify(node, fontStringify);
		}
	});

	function applyMargins(callback) {
		var margin = node._margin;

		if (margin) {
			self.writer.context.moveDown(margin[1]);
			self.writer.context.addMargin(margin[0], margin[2]);
		}

		callback();

		if(margin) {
			self.writer.context.addMargin(-margin[0], -margin[2]);
			self.writer.context.moveDown(margin[3]);
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
	var availableWidth = this.writer.context.availableWidth;
	var gaps = gapArray(columnNode._gap);

	if (gaps) availableWidth -= (gaps.length - 1) * columnNode._gap;

	ColumnCalculator.buildColumnWidths(columns, availableWidth);
	this.processRow(columns, columns, gaps);


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

LayoutBuilder.prototype.processRow = function(columns, widths, gaps) {
	widths = widths || columns;

	this.writer.context.beginColumnGroup();

	for(var i = 0, l = columns.length; i < l; i++) {
		var column = columns[i];
        var width = widths[i]._calcWidth;
        var leftOffset = colLeftOffset(i);

        if (column.colSpan && column.colSpan > 1) {
            for(var j = 1; j < column.colSpan; j++) {
                width += widths[++i]._calcWidth + gaps[i];
            }
        }

        this.writer.context.beginColumn(width, leftOffset);
		this.processNode(column);
	}

	this.writer.context.completeColumnGroup();

	function colLeftOffset(i) {
		if (gaps && gaps.length > i) return gaps[i];
		return 0;
	}
};

// lists
LayoutBuilder.prototype.processList = function(orderedList, items, gapSize) {
	var self = this;

	this.writer.context.addMargin(gapSize.width);

	var nextMarker;
	this.tracker.auto('lineAdded', addMarkerToFirstLeaf, function() {
		items.forEach(function(item) {
			nextMarker = item.listMarker;
			self.processNode(item);
		});
	});

	this.writer.context.addMargin(-gapSize.width);

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
	var self = this;
	var layout = tableNode._layout;
	var offsets = tableNode._offsets;

	ColumnCalculator.buildColumnWidths(tableNode.table.widths, this.writer.context.availableWidth - offsets.total);

	var totalTableWidth = offsets.total + getTableWidth();

	var headerRows = tableNode.table.headerRows;
	var keepWithHeaderRows = (tableNode.table.keepWithHeaderRows === undefined) ? 0 : tableNode.table.keepWithHeaderRows;
	var waitingForCommit = false;
	var headerBlock;

	if(headerRows) {
		this.writer.beginUnbreakableBlock();
		waitingForCommit = true;
	}

	drawHorizontalLine(layout, 0);

	for(var i = 0, l = tableNode.table.body.length; i < l; i++) {
		this.writer.context.moveDown(layout.paddingTop(i, tableNode));
		this.processRow(tableNode.table.body[i], tableNode.table.widths, offsets.offsets);
		this.writer.context.moveDown(layout.paddingBottom(i, tableNode));
		drawHorizontalLine(layout, i + 1);

		if (headerRows && i === headerRows - 1) {
			// header has been created
			headerBlock = this.writer.unbreakableBlockToRepeatable();
		}

		if (waitingForCommit && ((i === headerRows + keepWithHeaderRows - 1) || (i === l - 1))) {
			this.writer.commitUnbreakableBlock();
			if (headerBlock) this.writer.pushToRepeatables(headerBlock);
			waitingForCommit = false;
		}
	}

	this.writer.popFromRepeatables();

	function drawHorizontalLine(layout, i) {
		var width = layout.hLineWidth(i, tableNode, tableNode);
		if (width) {
			var offset = width / 2;

			self.writer.addVector({ type:'line', x1: 0, x2: totalTableWidth, y1: offset, y2: offset, lineWidth: width, lineColor: layout.hLineColor(i, tableNode) });
			self.writer.context.moveDown(width);
		}
	}

	function getTableWidth() {
		var width = 0;

		tableNode.table.widths.forEach(function(w) {
			width += w._calcWidth;
		});

		return width;
	}
};


LayoutBuilder.prototype.addHorizontalLine = function(x1, x2, lh) {
	var context = this.getContext();
	context.y += lh/2;
	context.availableHeight -= lh/2;

	var line = {
		type: 'line',
		x1: context.x + x1,
		y1: context.y,
		x2: context.x + x2,
		y2: context.y,
		lineWidth: lh
	};

	context.y += lh/2;
	context.availableHeight -= lh/2;

	this.getPage(context.page).vectors.push(line);
};

// leafs (texts)
LayoutBuilder.prototype.processLeaf = function(node) {
	var line = this.buildNextLine(node);

	while (line) {
		this.writer.addLine(line);
		line = this.buildNextLine(node);
	}
};

LayoutBuilder.prototype.buildNextLine = function(textNode) {
	if (!textNode._inlines || textNode._inlines.length === 0) return null;

	var line = new Line(this.writer.context.availableWidth);

	while(textNode._inlines && textNode._inlines.length > 0 && line.hasEnoughSpaceForInline(textNode._inlines[0])) {
		line.addInline(textNode._inlines.shift());
	}

	line.lastLineInParagraph = textNode._inlines.length === 0;
	return line;
};

LayoutBuilder.prototype.processCanvas = function(node) {
	var height = node._minHeight;

	if (this.writer.context.availableHeight < height) {
		// TODO: support for canvas larger than a page
		// TODO: support for other overflow methods

		this.writer.moveToNextPage();
	}

	node.canvas.forEach(function(vector) {
		this.writer.addVector(vector);
	}, this);

	this.writer.context.moveDown(height);
};


module.exports = LayoutBuilder;
