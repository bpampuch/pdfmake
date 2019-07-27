/*eslint no-unused-vars: ["error", {"args": "none"}]*/

'use strict';

var TextTools = require('./textTools');
var StyleContextStack = require('./styleContextStack');
var ColumnCalculator = require('./columnCalculator');
var isString = require('./helpers').isString;
var isNumber = require('./helpers').isNumber;
var isObject = require('./helpers').isObject;
var isArray = require('./helpers').isArray;
var fontStringify = require('./helpers').fontStringify;
var getNodeId = require('./helpers').getNodeId;
var pack = require('./helpers').pack;
var qrEncoder = require('./qrEnc.js');

/**
 * @private
 */
function DocMeasure(fontProvider, styleDictionary, defaultStyle, imageMeasure, svgMeasure, tableLayouts, images) {
	this.textTools = new TextTools(fontProvider);
	this.styleStack = new StyleContextStack(styleDictionary, defaultStyle);
	this.imageMeasure = imageMeasure;
	this.svgMeasure = svgMeasure;
	this.tableLayouts = tableLayouts;
	this.images = images;
	this.autoImageIndex = 1;
}

/**
 * Measures all nodes and sets min/max-width properties required for the second
 * layout-pass.
 * @param  {Object} docStructure document-definition-object
 * @return {Object}              document-measurement-object
 */
DocMeasure.prototype.measureDocument = function (docStructure) {
	return this.measureNode(docStructure);
};

DocMeasure.prototype.measureNode = function (node) {

	var self = this;

	return this.styleStack.auto(node, function () {
		// TODO: refactor + rethink whether this is the proper way to handle margins
		node._margin = getNodeMargin(node);

		if (node.columns) {
			return extendMargins(self.measureColumns(node));
		} else if (node.stack) {
			return extendMargins(self.measureVerticalContainer(node));
		} else if (node.ul) {
			return extendMargins(self.measureUnorderedList(node));
		} else if (node.ol) {
			return extendMargins(self.measureOrderedList(node));
		} else if (node.table) {
			return extendMargins(self.measureTable(node));
		} else if (node.text !== undefined) {
			return extendMargins(self.measureLeaf(node));
		} else if (node.toc) {
			return extendMargins(self.measureToc(node));
		} else if (node.image) {
			return extendMargins(self.measureImage(node));
		} else if (node.svg) {
			return extendMargins(self.measureSVG(node));
		} else if (node.canvas) {
			return extendMargins(self.measureCanvas(node));
		} else if (node.qr) {
			return extendMargins(self.measureQr(node));
		} else {
			throw 'Unrecognized document structure: ' + JSON.stringify(node, fontStringify);
		}
	});

	function extendMargins(node) {
		var margin = node._margin;

		if (margin) {
			node._minWidth += margin[0] + margin[2];
			node._maxWidth += margin[0] + margin[2];
		}

		return node;
	}

	function getNodeMargin() {

		function processSingleMargins(node, currentMargin) {
			if (node.marginLeft || node.marginTop || node.marginRight || node.marginBottom) {
				return [
					node.marginLeft || currentMargin[0] || 0,
					node.marginTop || currentMargin[1] || 0,
					node.marginRight || currentMargin[2] || 0,
					node.marginBottom || currentMargin[3] || 0
				];
			}
			return currentMargin;
		}

		function flattenStyleArray(styleArray) {
			var flattenedStyles = {};
			for (var i = styleArray.length - 1; i >= 0; i--) {
				var styleName = styleArray[i];
				var style = self.styleStack.styleDictionary[styleName];
				for (var key in style) {
					if (style.hasOwnProperty(key)) {
						flattenedStyles[key] = style[key];
					}
				}
			}
			return flattenedStyles;
		}

		function convertMargin(margin) {
			if (isNumber(margin)) {
				margin = [margin, margin, margin, margin];
			} else if (isArray(margin)) {
				if (margin.length === 2) {
					margin = [margin[0], margin[1], margin[0], margin[1]];
				}
			}
			return margin;
		}

		var margin = [undefined, undefined, undefined, undefined];

		if (node.style) {
			var styleArray = isArray(node.style) ? node.style : [node.style];
			var flattenedStyleArray = flattenStyleArray(styleArray);

			if (flattenedStyleArray) {
				margin = processSingleMargins(flattenedStyleArray, margin);
			}

			if (flattenedStyleArray.margin) {
				margin = convertMargin(flattenedStyleArray.margin);
			}
		}

		margin = processSingleMargins(node, margin);

		if (node.margin) {
			margin = convertMargin(node.margin);
		}

		if (margin[0] === undefined && margin[1] === undefined && margin[2] === undefined && margin[3] === undefined) {
			return null;
		} else {
			return margin;
		}
	}
};

DocMeasure.prototype.convertIfBase64Image = function (node) {
	if (/^data:image\/(jpeg|jpg|png);base64,/.test(node.image)) {
		var label = '$$pdfmake$$' + this.autoImageIndex++;
		this.images[label] = node.image;
		node.image = label;
	}
};

DocMeasure.prototype.measureImageWithDimensions = function (node, dimensions) {
	if (node.fit) {
		var factor = (dimensions.width / dimensions.height > node.fit[0] / node.fit[1]) ? node.fit[0] / dimensions.width : node.fit[1] / dimensions.height;
		node._width = node._minWidth = node._maxWidth = dimensions.width * factor;
		node._height = dimensions.height * factor;
	} else {
		node._width = node._minWidth = node._maxWidth = node.width || dimensions.width;
		node._height = node.height || (dimensions.height * node._width / dimensions.width);

		if (isNumber(node.maxWidth) && node.maxWidth < node._width) {
			node._width = node._minWidth = node._maxWidth = node.maxWidth;
			node._height = node._width * dimensions.height / dimensions.width;
		}

		if (isNumber(node.maxHeight) && node.maxHeight < node._height) {
			node._height = node.maxHeight;
			node._width = node._minWidth = node._maxWidth = node._height * dimensions.width / dimensions.height;
		}

		if (isNumber(node.minWidth) && node.minWidth > node._width) {
			node._width = node._minWidth = node._maxWidth = node.minWidth;
			node._height = node._width * dimensions.height / dimensions.width;
		}

		if (isNumber(node.minHeight) && node.minHeight > node._height) {
			node._height = node.minHeight;
			node._width = node._minWidth = node._maxWidth = node._height * dimensions.width / dimensions.height;
		}
	}

	node._alignment = this.styleStack.getProperty('alignment');
};

DocMeasure.prototype.measureImage = function (node) {
	if (this.images) {
		this.convertIfBase64Image(node);
	}

	var dimensions = this.imageMeasure.measureImage(node.image);

	this.measureImageWithDimensions(node, dimensions);

	return node;
};

DocMeasure.prototype.measureSVG = function (node) {

	var dimensions = this.svgMeasure.measureSVG(node.svg);

	this.measureImageWithDimensions(node, dimensions);

	// scale SVG based on final dimension
	node.svg = this.svgMeasure.writeDimensions(node.svg, {
		width: node._width,
		height: node._height
	});

	return node;
};

DocMeasure.prototype.measureLeaf = function (node) {

	if (node._textRef && node._textRef._textNodeRef.text) {
		node.text = node._textRef._textNodeRef.text;
	}

	// Make sure style properties of the node itself are considered when building inlines.
	// We could also just pass [node] to buildInlines, but that fails for bullet points.
	var styleStack = this.styleStack.clone();
	styleStack.push(node);

	var data = this.textTools.buildInlines(node.text, styleStack);

	node._inlines = data.items;
	node._minWidth = data.minWidth;
	node._maxWidth = data.maxWidth;

	return node;
};

DocMeasure.prototype.measureToc = function (node) {
	if (node.toc.title) {
		node.toc.title = this.measureNode(node.toc.title);
	}

	if (node.toc._items.length > 0) {
		var body = [];
		var textStyle = node.toc.textStyle || {};
		var numberStyle = node.toc.numberStyle || textStyle;
		var textMargin = node.toc.textMargin || [0, 0, 0, 0];
		for (var i = 0, l = node.toc._items.length; i < l; i++) {
			var item = node.toc._items[i];
			var lineStyle = item._textNodeRef.tocStyle || textStyle;
			var lineMargin = item._textNodeRef.tocMargin || textMargin;
			var lineNumberStyle = item._textNodeRef.tocNumberStyle || numberStyle;
			var destination = getNodeId(item._nodeRef);
			body.push([
				{ text: item._textNodeRef.text, linkToDestination: destination, alignment: 'left', style: lineStyle, margin: lineMargin },
				{ text: '00000', linkToDestination: destination, alignment: 'right', _tocItemRef: item._nodeRef, style: lineNumberStyle, margin: [0, lineMargin[1], 0, lineMargin[3]] }
			]);
		}


		node.toc._table = {
			table: {
				dontBreakRows: true,
				widths: ['*', 'auto'],
				body: body
			},
			layout: 'noBorders'
		};

		node.toc._table = this.measureNode(node.toc._table);
	}

	return node;
};

DocMeasure.prototype.measureVerticalContainer = function (node) {
	var items = node.stack;

	node._minWidth = 0;
	node._maxWidth = 0;

	for (var i = 0, l = items.length; i < l; i++) {
		items[i] = this.measureNode(items[i]);

		node._minWidth = Math.max(node._minWidth, items[i]._minWidth);
		node._maxWidth = Math.max(node._maxWidth, items[i]._maxWidth);
	}

	return node;
};

DocMeasure.prototype.gapSizeForList = function () {
	return this.textTools.sizeOfString('9. ', this.styleStack);
};

DocMeasure.prototype.buildUnorderedMarker = function (styleStack, gapSize, type) {
	function buildDisc(gapSize, color) {
		// TODO: ascender-based calculations
		var radius = gapSize.fontSize / 6;
		return {
			canvas: [{
				x: radius,
				y: (gapSize.height / gapSize.lineHeight) + gapSize.descender - gapSize.fontSize / 3,
				r1: radius,
				r2: radius,
				type: 'ellipse',
				color: color
			}]
		};
	}

	function buildSquare(gapSize, color) {
		// TODO: ascender-based calculations
		var size = gapSize.fontSize / 3;
		return {
			canvas: [{
				x: 0,
				y: (gapSize.height / gapSize.lineHeight) + gapSize.descender - (gapSize.fontSize / 3) - (size / 2),
				h: size,
				w: size,
				type: 'rect',
				color: color
			}]
		};
	}

	function buildCircle(gapSize, color) {
		// TODO: ascender-based calculations
		var radius = gapSize.fontSize / 6;
		return {
			canvas: [{
				x: radius,
				y: (gapSize.height / gapSize.lineHeight) + gapSize.descender - gapSize.fontSize / 3,
				r1: radius,
				r2: radius,
				type: 'ellipse',
				lineColor: color
			}]
		};
	}

	var marker;
	var color = styleStack.getProperty('markerColor') || styleStack.getProperty('color') || 'black';

	switch (type) {
		case 'circle':
			marker = buildCircle(gapSize, color);
			break;

		case 'square':
			marker = buildSquare(gapSize, color);
			break;

		case 'none':
			marker = {};
			break;

		case 'disc':
		default:
			marker = buildDisc(gapSize, color);
			break;
	}

	marker._minWidth = marker._maxWidth = gapSize.width;
	marker._minHeight = marker._maxHeight = gapSize.height;

	return marker;
};

DocMeasure.prototype.buildOrderedMarker = function (counter, styleStack, type, separator) {
	function prepareAlpha(counter) {
		function toAlpha(num) {
			return (num >= 26 ? toAlpha((num / 26 >> 0) - 1) : '') + 'abcdefghijklmnopqrstuvwxyz'[num % 26 >> 0];
		}

		if (counter < 1) {
			return counter.toString();
		}

		return toAlpha(counter - 1);
	}

	function prepareRoman(counter) {
		if (counter < 1 || counter > 4999) {
			return counter.toString();
		}
		var num = counter;
		var lookup = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 }, roman = '', i;
		for (i in lookup) {
			while (num >= lookup[i]) {
				roman += i;
				num -= lookup[i];
			}
		}
		return roman;
	}

	function prepareDecimal(counter) {
		return counter.toString();
	}

	var counterText;
	switch (type) {
		case 'none':
			counterText = null;
			break;

		case 'upper-alpha':
			counterText = prepareAlpha(counter).toUpperCase();
			break;

		case 'lower-alpha':
			counterText = prepareAlpha(counter);
			break;

		case 'upper-roman':
			counterText = prepareRoman(counter);
			break;

		case 'lower-roman':
			counterText = prepareRoman(counter).toLowerCase();
			break;

		case 'decimal':
		default:
			counterText = prepareDecimal(counter);
			break;
	}

	if (counterText === null) {
		return {};
	}

	if (separator) {
		if (isArray(separator)) {
			if (separator[0]) {
				counterText = separator[0] + counterText;
			}

			if (separator[1]) {
				counterText += separator[1];
			}
			counterText += ' ';
		} else {
			counterText += separator + ' ';
		}
	}

	var textArray = { text: counterText };
	var markerColor = styleStack.getProperty('markerColor');
	if (markerColor) {
		textArray.color = markerColor;
	}

	return { _inlines: this.textTools.buildInlines(textArray, styleStack).items };
};

DocMeasure.prototype.measureUnorderedList = function (node) {
	var style = this.styleStack.clone();
	var items = node.ul;
	node.type = node.type || 'disc';
	node._gapSize = this.gapSizeForList();
	node._minWidth = 0;
	node._maxWidth = 0;

	for (var i = 0, l = items.length; i < l; i++) {
		var item = items[i] = this.measureNode(items[i]);

		if (!item.ol && !item.ul) {
			item.listMarker = this.buildUnorderedMarker(style, node._gapSize, item.listType || node.type);
		}

		node._minWidth = Math.max(node._minWidth, items[i]._minWidth + node._gapSize.width);
		node._maxWidth = Math.max(node._maxWidth, items[i]._maxWidth + node._gapSize.width);
	}

	return node;
};

DocMeasure.prototype.measureOrderedList = function (node) {
	var style = this.styleStack.clone();
	var items = node.ol;
	node.type = node.type || 'decimal';
	node.separator = node.separator || '.';
	node.reversed = node.reversed || false;
	if (!isNumber(node.start)) {
		node.start = node.reversed ? items.length : 1;
	}
	node._gapSize = this.gapSizeForList();
	node._minWidth = 0;
	node._maxWidth = 0;

	var counter = node.start;
	for (var i = 0, l = items.length; i < l; i++) {
		var item = items[i] = this.measureNode(items[i]);

		if (!item.ol && !item.ul) {
			var counterValue = isNumber(item.counter) ? item.counter : counter;
			item.listMarker = this.buildOrderedMarker(counterValue, style, item.listType || node.type, node.separator);
			if (item.listMarker._inlines) {
				node._gapSize.width = Math.max(node._gapSize.width, item.listMarker._inlines[0].width);
			}
		}  // TODO: else - nested lists numbering

		node._minWidth = Math.max(node._minWidth, items[i]._minWidth);
		node._maxWidth = Math.max(node._maxWidth, items[i]._maxWidth);

		if (node.reversed) {
			counter--;
		} else {
			counter++;
		}
	}

	node._minWidth += node._gapSize.width;
	node._maxWidth += node._gapSize.width;

	for (var i = 0, l = items.length; i < l; i++) {
		var item = items[i];
		if (!item.ol && !item.ul) {
			item.listMarker._minWidth = item.listMarker._maxWidth = node._gapSize.width;
		}
	}

	return node;
};

DocMeasure.prototype.measureColumns = function (node) {
	var columns = node.columns;
	node._gap = this.styleStack.getProperty('columnGap') || 0;

	for (var i = 0, l = columns.length; i < l; i++) {
		columns[i] = this.measureNode(columns[i]);
	}

	var measures = ColumnCalculator.measureMinMax(columns);

	var numGaps = (columns.length > 0) ? (columns.length - 1) : 0;
	node._minWidth = measures.min + node._gap * numGaps;
	node._maxWidth = measures.max + node._gap * numGaps;

	return node;
};

DocMeasure.prototype.measureTable = function (node) {
	extendTableWidths(node);
	node._layout = getLayout(this.tableLayouts);
	node._offsets = getOffsets(node._layout);

	var colSpans = [];
	var col, row, cols, rows;

	for (col = 0, cols = node.table.body[0].length; col < cols; col++) {
		var c = node.table.widths[col];
		c._minWidth = 0;
		c._maxWidth = 0;

		for (row = 0, rows = node.table.body.length; row < rows; row++) {
			var rowData = node.table.body[row];
			var data = rowData[col];
			if (data === undefined) {
				console.error('Malformed table row ', rowData, 'in node ', node);
				throw 'Malformed table row, a cell is undefined.';
			}
			if (data === null) { // transform to object
				data = '';
			}

			if (!data._span) {
				data = rowData[col] = this.styleStack.auto(data, measureCb(this, data));

				if (data.colSpan && data.colSpan > 1) {
					markSpans(rowData, col, data.colSpan);
					colSpans.push({ col: col, span: data.colSpan, minWidth: data._minWidth, maxWidth: data._maxWidth });
				} else {
					c._minWidth = Math.max(c._minWidth, data._minWidth);
					c._maxWidth = Math.max(c._maxWidth, data._maxWidth);
				}
			}

			if (data.rowSpan && data.rowSpan > 1) {
				markVSpans(node.table, row, col, data.rowSpan);
			}
		}
	}

	extendWidthsForColSpans();

	var measures = ColumnCalculator.measureMinMax(node.table.widths);

	node._minWidth = measures.min + node._offsets.total;
	node._maxWidth = measures.max + node._offsets.total;

	return node;

	function measureCb(_this, data) {
		return function () {
			if (isObject(data)) {
				data.fillColor = _this.styleStack.getProperty('fillColor');
			}
			return _this.measureNode(data);
		};
	}

	function getLayout(tableLayouts) {
		var layout = node.layout;

		if (isString(layout)) {
			layout = tableLayouts[layout];
		}

		var defaultLayout = {
			hLineWidth: function (i, node) {
				return 1;
			},
			vLineWidth: function (i, node) {
				return 1;
			},
			hLineColor: function (i, node) {
				return 'black';
			},
			vLineColor: function (i, node) {
				return 'black';
			},
			hLineStyle: function (i, node) {
				return null;
			},
			vLineStyle: function (i, node) {
				return null;
			},
			paddingLeft: function (i, node) {
				return 4;
			},
			paddingRight: function (i, node) {
				return 4;
			},
			paddingTop: function (i, node) {
				return 2;
			},
			paddingBottom: function (i, node) {
				return 2;
			},
			fillColor: function (i, node) {
				return null;
			},
			defaultBorder: true
		};

		return pack(defaultLayout, layout);
	}

	function getOffsets(layout) {
		var offsets = [];
		var totalOffset = 0;
		var prevRightPadding = 0;

		for (var i = 0, l = node.table.widths.length; i < l; i++) {
			var lOffset = prevRightPadding + layout.vLineWidth(i, node) + layout.paddingLeft(i, node);
			offsets.push(lOffset);
			totalOffset += lOffset;
			prevRightPadding = layout.paddingRight(i, node);
		}

		totalOffset += prevRightPadding + layout.vLineWidth(node.table.widths.length, node);

		return {
			total: totalOffset,
			offsets: offsets
		};
	}

	function extendWidthsForColSpans() {
		var q, j;

		for (var i = 0, l = colSpans.length; i < l; i++) {
			var span = colSpans[i];

			var currentMinMax = getMinMax(span.col, span.span, node._offsets);
			var minDifference = span.minWidth - currentMinMax.minWidth;
			var maxDifference = span.maxWidth - currentMinMax.maxWidth;

			if (minDifference > 0) {
				q = minDifference / span.span;

				for (j = 0; j < span.span; j++) {
					node.table.widths[span.col + j]._minWidth += q;
				}
			}

			if (maxDifference > 0) {
				q = maxDifference / span.span;

				for (j = 0; j < span.span; j++) {
					node.table.widths[span.col + j]._maxWidth += q;
				}
			}
		}
	}

	function getMinMax(col, span, offsets) {
		var result = { minWidth: 0, maxWidth: 0 };

		for (var i = 0; i < span; i++) {
			result.minWidth += node.table.widths[col + i]._minWidth + (i ? offsets.offsets[col + i] : 0);
			result.maxWidth += node.table.widths[col + i]._maxWidth + (i ? offsets.offsets[col + i] : 0);
		}

		return result;
	}

	function markSpans(rowData, col, span) {
		for (var i = 1; i < span; i++) {
			rowData[col + i] = {
				_span: true,
				_minWidth: 0,
				_maxWidth: 0,
				rowSpan: rowData[col].rowSpan
			};
		}
	}

	function markVSpans(table, row, col, span) {
		for (var i = 1; i < span; i++) {
			table.body[row + i][col] = {
				_span: true,
				_minWidth: 0,
				_maxWidth: 0,
				fillColor: table.body[row][col].fillColor
			};
		}
	}

	function extendTableWidths(node) {
		if (!node.table.widths) {
			node.table.widths = 'auto';
		}

		if (isString(node.table.widths)) {
			node.table.widths = [node.table.widths];

			while (node.table.widths.length < node.table.body[0].length) {
				node.table.widths.push(node.table.widths[node.table.widths.length - 1]);
			}
		}

		for (var i = 0, l = node.table.widths.length; i < l; i++) {
			var w = node.table.widths[i];
			if (isNumber(w) || isString(w)) {
				node.table.widths[i] = { width: w };
			}
		}
	}
};

DocMeasure.prototype.measureCanvas = function (node) {
	var w = 0, h = 0;

	for (var i = 0, l = node.canvas.length; i < l; i++) {
		var vector = node.canvas[i];

		switch (vector.type) {
			case 'ellipse':
				w = Math.max(w, vector.x + vector.r1);
				h = Math.max(h, vector.y + vector.r2);
				break;
			case 'rect':
				w = Math.max(w, vector.x + vector.w);
				h = Math.max(h, vector.y + vector.h);
				break;
			case 'line':
				w = Math.max(w, vector.x1, vector.x2);
				h = Math.max(h, vector.y1, vector.y2);
				break;
			case 'polyline':
				for (var i2 = 0, l2 = vector.points.length; i2 < l2; i2++) {
					w = Math.max(w, vector.points[i2].x);
					h = Math.max(h, vector.points[i2].y);
				}
				break;
		}
	}

	node._minWidth = node._maxWidth = w;
	node._minHeight = node._maxHeight = h;
	node._alignment = this.styleStack.getProperty('alignment');

	return node;
};

DocMeasure.prototype.measureQr = function (node) {
	node = qrEncoder.measure(node);
	node._alignment = this.styleStack.getProperty('alignment');
	return node;
};

module.exports = DocMeasure;
