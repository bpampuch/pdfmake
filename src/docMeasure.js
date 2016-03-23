/* jslint node: true */
'use strict';

var TextTools = require('./textTools');
var StyleContextStack = require('./styleContextStack');
var ColumnCalculator = require('./columnCalculator');
var fontStringify = require('./helpers').fontStringify;
var pack = require('./helpers').pack;
var qrEncoder = require('./qrEnc.js');

/**
* @private
*/
function DocMeasure(fontProvider, styleDictionary, defaultStyle, imageMeasure, tableLayouts, images) {
	this.textTools = new TextTools(fontProvider);
	this.styleStack = new StyleContextStack(styleDictionary, defaultStyle);
	this.imageMeasure = imageMeasure;
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
DocMeasure.prototype.measureDocument = function(docStructure) {
	return this.measureNode(docStructure);
};

DocMeasure.prototype.measureNode = function(node) {
	// expand shortcuts
	if (node instanceof Array) {
		node = { stack: node };
	} else if (typeof node == 'string' || node instanceof String) {
		node = { text: node };
	}
	
	// Deal with empty nodes to prevent crash in getNodeMargin
	if (Object.keys(node).length === 0) {
		// A warning could be logged: console.warn('pdfmake: Empty node, ignoring it');
		node = { text: '' };
	}

	var self = this;

	return this.styleStack.auto(node, function() {
		// TODO: refactor + rethink whether this is the proper way to handle margins
		node._margin = getNodeMargin(node);

		if (node.columns) {
			return extendMargins(self.measureColumns(node));
		} else if (node.stack) {
			return extendMargins(self.measureVerticalContainer(node));
		} else if (node.ul) {
			return extendMargins(self.measureList(false, node));
		} else if (node.ol) {
			return extendMargins(self.measureList(true, node));
		} else if (node.table) {
			return extendMargins(self.measureTable(node));
		} else if (node.text !== undefined) {
			return extendMargins(self.measureLeaf(node));
		} else if (node.image) {
			return extendMargins(self.measureImage(node));
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

		function processSingleMargins(node, currentMargin){
			if (node.marginLeft || node.marginTop || node.marginRight || node.marginBottom) {
				return [
					node.marginLeft || currentMargin[0] || 0,
					node.marginTop || currentMargin[1] || 0,
					node.marginRight || currentMargin[2]  || 0,
					node.marginBottom || currentMargin[3]  || 0
				];
			}
			return currentMargin;
		}

		function flattenStyleArray(styleArray){
			var flattenedStyles = {};
			for (var i = styleArray.length - 1; i >= 0; i--) {
				var styleName = styleArray[i];
				var style = self.styleStack.styleDictionary[styleName];
				for(var key in style){
					if(style.hasOwnProperty(key)){
						flattenedStyles[key] = style[key];
					}
				}
			}
			return flattenedStyles;
		}

		function convertMargin(margin) {
			if (typeof margin === 'number' || margin instanceof Number) {
				margin = [ margin, margin, margin, margin ];
			} else if (margin instanceof Array) {
				if (margin.length === 2) {
					margin = [ margin[0], margin[1], margin[0], margin[1] ];
				}
			}
			return margin;
		}

		var margin = [undefined, undefined, undefined, undefined];

		if(node.style) {
			var styleArray = (node.style instanceof Array) ? node.style : [node.style];
			var flattenedStyleArray = flattenStyleArray(styleArray);

			if(flattenedStyleArray) {
				margin = processSingleMargins(flattenedStyleArray, margin);
			}

			if(flattenedStyleArray.margin){
				margin = convertMargin(flattenedStyleArray.margin);
			}
		}
		
		margin = processSingleMargins(node, margin);

		if(node.margin){
			margin = convertMargin(node.margin);
		}

		if(margin[0] === undefined && margin[1] === undefined && margin[2] === undefined && margin[3] === undefined) {
			return null;
		} else {
			return margin;
		}
	}
};

DocMeasure.prototype.convertIfBase64Image = function(node) {
	if (/^data:image\/(jpeg|jpg|png);base64,/.test(node.image)) {
		var label = '$$pdfmake$$' + this.autoImageIndex++;
		this.images[label] = node.image;
		node.image = label;
}
};

DocMeasure.prototype.measureImage = function(node) {
	if (this.images) {
		this.convertIfBase64Image(node);
	}

	var imageSize = this.imageMeasure.measureImage(node.image);

	if (node.fit) {
		var factor = (imageSize.width / imageSize.height > node.fit[0] / node.fit[1]) ? node.fit[0] / imageSize.width : node.fit[1] / imageSize.height;
		node._width = node._minWidth = node._maxWidth = imageSize.width * factor;
		node._height = imageSize.height * factor;
	} else {
		node._width = node._minWidth = node._maxWidth = node.width || imageSize.width;
		node._height = node.height || (imageSize.height * node._width / imageSize.width);
	}

	node._alignment = this.styleStack.getProperty('alignment');
	return node;
};

DocMeasure.prototype.measureLeaf = function(node) {

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

DocMeasure.prototype.measureVerticalContainer = function(node) {
	var items = node.stack;

	node._minWidth = 0;
	node._maxWidth = 0;

	for(var i = 0, l = items.length; i < l; i++) {
		items[i] = this.measureNode(items[i]);

		node._minWidth = Math.max(node._minWidth, items[i]._minWidth);
		node._maxWidth = Math.max(node._maxWidth, items[i]._maxWidth);
	}

	return node;
};

DocMeasure.prototype.gapSizeForList = function(isOrderedList, listItems) {
	if (isOrderedList) {
		var longestNo = (listItems.length).toString().replace(/./g, '9');
		return this.textTools.sizeOfString(longestNo + '. ', this.styleStack);
	} else {
		return this.textTools.sizeOfString('9. ', this.styleStack);
	}
};

DocMeasure.prototype.buildMarker = function(isOrderedList, counter, styleStack, gapSize) {
	var marker;

	if (isOrderedList) {
		marker = { _inlines: this.textTools.buildInlines(counter, styleStack).items };
	}
	else {
		// TODO: ascender-based calculations
		var radius = gapSize.fontSize / 6;
		marker = {
			canvas: [ {
				x: radius,
				y: (gapSize.height / gapSize.lineHeight) + gapSize.decender - gapSize.fontSize / 3,//0,// gapSize.fontSize * 2 / 3,
				r1: radius,
				r2: radius,
				type: 'ellipse',
				color: 'black'
			} ]
		};
	}

	marker._minWidth = marker._maxWidth = gapSize.width;
	marker._minHeight = marker._maxHeight = gapSize.height;

	return marker;
};

DocMeasure.prototype.measureList = function(isOrdered, node) {
	var style = this.styleStack.clone();

	var items = isOrdered ? node.ol : node.ul;
	node._gapSize = this.gapSizeForList(isOrdered, items);
	node._minWidth = 0;
	node._maxWidth = 0;

	var counter = 1;

	for(var i = 0, l = items.length; i < l; i++) {
		var nextItem = items[i] = this.measureNode(items[i]);

		var marker = counter++ + '. ';

		if (!nextItem.ol && !nextItem.ul) {
			nextItem.listMarker = this.buildMarker(isOrdered, nextItem.counter || marker, style, node._gapSize);
		}  // TODO: else - nested lists numbering

		node._minWidth = Math.max(node._minWidth, items[i]._minWidth + node._gapSize.width);
		node._maxWidth = Math.max(node._maxWidth, items[i]._maxWidth + node._gapSize.width);
	}

	return node;
};

DocMeasure.prototype.measureColumns = function(node) {
	var columns = node.columns;
	node._gap = this.styleStack.getProperty('columnGap') || 0;

	for(var i = 0, l = columns.length; i < l; i++) {
		columns[i] = this.measureNode(columns[i]);
	}

	var measures = ColumnCalculator.measureMinMax(columns);

	node._minWidth = measures.min + node._gap * (columns.length - 1);
	node._maxWidth = measures.max + node._gap * (columns.length - 1);

	return node;
};

DocMeasure.prototype.measureTable = function(node) {
	extendTableWidths(node);
	node._layout = getLayout(this.tableLayouts);
	node._offsets = getOffsets(node._layout);

	var colSpans = [];
	var col, row, cols, rows;

	for(col = 0, cols = node.table.body[0].length; col < cols; col++) {
		var c = node.table.widths[col];
		c._minWidth = 0;
		c._maxWidth = 0;

		for(row = 0, rows = node.table.body.length; row < rows; row++) {
			var rowData = node.table.body[row];
			var data = rowData[col];
			if(data === undefined){
				console.error('Malformed table row ', rowData, 'in node ', node);
				throw 'Malformed table row, a cell is undefined.';
			}
			if (!data._span) {
				var _this = this;
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
		return function() {
			if (data !== null && typeof data === 'object') {
				data.fillColor = _this.styleStack.getProperty('fillColor');
			}
			return _this.measureNode(data);
		};
	}

	function getLayout(tableLayouts) {
		var layout = node.layout;

		if (typeof node.layout === 'string' || node instanceof String) {
			layout = tableLayouts[layout];
		}

		var defaultLayout = {
			hLineWidth: function(i, node) { return 1; }, //return node.table.headerRows && i === node.table.headerRows && 3 || 0; },
			vLineWidth: function(i, node) { return 1; },
			hLineColor: function(i, node) { return 'black'; },
			vLineColor: function(i, node) { return 'black'; },
			paddingLeft: function(i, node) { return 4; }, //i && 4 || 0; },
			paddingRight: function(i, node) { return 4; }, //(i < node.table.widths.length - 1) ? 4 : 0; },
			paddingTop: function(i, node) { return 2; },
			paddingBottom: function(i, node) { return 2; }
		};

		return pack(defaultLayout, layout);
	}

	function getOffsets(layout) {
		var offsets = [];
		var totalOffset = 0;
		var prevRightPadding = 0;

		for(var i = 0, l = node.table.widths.length; i < l; i++) {
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

				for(j = 0; j < span.span; j++) {
					node.table.widths[span.col + j]._minWidth += q;
				}
			}

			if (maxDifference > 0) {
				q = maxDifference / span.span;

				for(j = 0; j < span.span; j++) {
					node.table.widths[span.col + j]._maxWidth += q;
				}
			}
		}
	}

	function getMinMax(col, span, offsets) {
		var result = { minWidth: 0, maxWidth: 0 };

		for(var i = 0; i < span; i++) {
			result.minWidth += node.table.widths[col + i]._minWidth + (i? offsets.offsets[col + i] : 0);
			result.maxWidth += node.table.widths[col + i]._maxWidth + (i? offsets.offsets[col + i] : 0);
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

		if (typeof node.table.widths === 'string' || node.table.widths instanceof String) {
			node.table.widths = [ node.table.widths ];

			while(node.table.widths.length < node.table.body[0].length) {
				node.table.widths.push(node.table.widths[node.table.widths.length - 1]);
			}
		}

		for(var i = 0, l = node.table.widths.length; i < l; i++) {
			var w = node.table.widths[i];
			if (typeof w === 'number' || w instanceof Number || typeof w === 'string' || w instanceof String) {
				node.table.widths[i] = { width: w };
			}
		}
	}
};

DocMeasure.prototype.measureCanvas = function(node) {
	var w = 0, h = 0;

	for(var i = 0, l = node.canvas.length; i < l; i++) {
		var vector = node.canvas[i];

		switch(vector.type) {
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
			for(var i2 = 0, l2 = vector.points.length; i2 < l2; i2++) {
				w = Math.max(w, vector.points[i2].x);
				h = Math.max(h, vector.points[i2].y);
			}
			break;
		}
	}

	node._minWidth = node._maxWidth = w;
	node._minHeight = node._maxHeight = h;

	return node;
};

DocMeasure.prototype.measureQr = function(node) {
	node = qrEncoder.measure(node);
	node._alignment = this.styleStack.getProperty('alignment');
	return node;
};

module.exports = DocMeasure;
