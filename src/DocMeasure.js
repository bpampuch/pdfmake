import TextInlines from './TextInlines';
import StyleContextStack from './StyleContextStack';
import ColumnCalculator from './columnCalculator';
import { defaultTableLayout } from './tableLayouts';
import { isString, isNumber, isObject } from './helpers/variableType';
import { stringifyNode, getNodeId, getNodeMargin } from './helpers/node';
import { pack } from './helpers/tools';
import qrEncoder from './qrEnc.js';

class DocMeasure {
	constructor(
		pdfDocument,
		styleDictionary,
		defaultStyle,
		svgMeasure,
		tableLayouts
	) {
		this.pdfDocument = pdfDocument;
		this.textInlines = new TextInlines(pdfDocument);
		this.styleStack = new StyleContextStack(styleDictionary, defaultStyle);
		this.svgMeasure = svgMeasure;
		this.tableLayouts = tableLayouts;
		this.autoImageIndex = 1;
	}

	/**
	 * Measures all nodes and sets min/max-width properties required for the second
	 * layout-pass.
	 *
	 * @param {object} docStructure document-definition-object
	 * @returns {object} document-measurement-object
	 */
	measureDocument(docStructure) {
		return this.measureNode(docStructure);
	}

	measureNode(node) {
		return this.styleStack.auto(node, () => {
			// TODO: refactor + rethink whether this is the proper way to handle margins
			node._margin = getNodeMargin(node, this.styleStack);

			if (node.columns) {
				return extendMargins(this.measureColumns(node));
			} else if (node.stack) {
				return extendMargins(this.measureVerticalContainer(node));
			} else if (node.ul) {
				return extendMargins(this.measureUnorderedList(node));
			} else if (node.ol) {
				return extendMargins(this.measureOrderedList(node));
			} else if (node.table) {
				return extendMargins(this.measureTable(node));
			} else if (node.text !== undefined) {
				return extendMargins(this.measureLeaf(node));
			} else if (node.toc) {
				return extendMargins(this.measureToc(node));
			} else if (node.image) {
				return extendMargins(this.measureImage(node));
			} else if (node.svg) {
				return extendMargins(this.measureSVG(node));
			} else if (node.canvas) {
				return extendMargins(this.measureCanvas(node));
			} else if (node.qr) {
				return extendMargins(this.measureQr(node));
			} else if (node.attachment) {
				return extendMargins(this.measureAttachment(node));
			} else {
				throw new Error(`Unrecognized document structure: ${stringifyNode(node)}`);
			}
		});

		function extendMargins(node) {
			let margin = node._margin;

			if (margin) {
				node._minWidth += margin[0] + margin[2];
				node._maxWidth += margin[0] + margin[2];
			}

			return node;
		}
	}

	measureImageWithDimensions(node, dimensions) {
		if (node.fit) {
			let factor = (dimensions.width / dimensions.height > node.fit[0] / node.fit[1]) ? node.fit[0] / dimensions.width : node.fit[1] / dimensions.height;
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
	}

	convertIfBase64Image(node) {
		if (/^data:image\/(jpeg|jpg|png);base64,/.test(node.image)) { // base64 image
			let label = `$$pdfmake$$${this.autoImageIndex++}`;
			this.pdfDocument.images[label] = node.image;
			node.image = label;
		}
	}

	measureImage(node) {
		this.convertIfBase64Image(node);

		let image = this.pdfDocument.provideImage(node.image);
		let imageSize = { width: image.width, height: image.height };

		this.measureImageWithDimensions(node, imageSize);

		return node;
	}

	measureSVG(node) {
		let dimensions = this.svgMeasure.measureSVG(node.svg);

		this.measureImageWithDimensions(node, dimensions);

		node.font = this.styleStack.getProperty('font');

		// scale SVG based on final dimension
		node.svg = this.svgMeasure.writeDimensions(node.svg, { width: node._width, height: node._height });

		return node;
	}

	measureLeaf(node) {

		if (node._textRef && node._textRef._textNodeRef.text) {
			node.text = node._textRef._textNodeRef.text;
		}

		// Make sure style properties of the node itself are considered when building inlines.
		// We could also just pass [node] to buildInlines, but that fails for bullet points.
		let styleStack = this.styleStack.clone();
		styleStack.push(node);

		let data = this.textInlines.buildInlines(node.text, styleStack);

		node._inlines = data.items;
		node._minWidth = data.minWidth;
		node._maxWidth = data.maxWidth;

		return node;
	}

	measureToc(node) {
		if (node.toc.title) {
			node.toc.title = this.measureNode(node.toc.title);
		}

		if (node.toc._items.length > 0) {
			let body = [];
			let textStyle = node.toc.textStyle || {};
			let numberStyle = node.toc.numberStyle || textStyle;
			let textMargin = node.toc.textMargin || [0, 0, 0, 0];
			for (let i = 0, l = node.toc._items.length; i < l; i++) {
				let item = node.toc._items[i];
				let lineStyle = item._textNodeRef.tocStyle || textStyle;
				let lineMargin = item._textNodeRef.tocMargin || textMargin;
				let lineNumberStyle = item._textNodeRef.tocNumberStyle || numberStyle;
				let destination = getNodeId(item._nodeRef);
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
	}

	measureVerticalContainer(node) {
		let items = node.stack;

		node._minWidth = 0;
		node._maxWidth = 0;

		for (let i = 0, l = items.length; i < l; i++) {
			items[i] = this.measureNode(items[i]);

			node._minWidth = Math.max(node._minWidth, items[i]._minWidth);
			node._maxWidth = Math.max(node._maxWidth, items[i]._maxWidth);
		}

		return node;
	}

	gapSizeForList() {
		return this.textInlines.sizeOfText('9. ', this.styleStack);
	}

	buildUnorderedMarker(styleStack, gapSize, type) {
		function buildDisc(gapSize, color) {
			// TODO: ascender-based calculations
			let radius = gapSize.fontSize / 6;
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
			let size = gapSize.fontSize / 3;
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
			let radius = gapSize.fontSize / 6;
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

		let marker;
		let color = styleStack.getProperty('markerColor') || styleStack.getProperty('color') || 'black';

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
	}

	buildOrderedMarker(counter, styleStack, type, separator) {
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
			let num = counter;
			let lookup = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
			let roman = '';
			for (let i in lookup) {
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

		let counterText;
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
			if (Array.isArray(separator)) {
				if (separator[0]) {
					counterText = separator[0] + counterText;
				}

				if (separator[1]) {
					counterText += separator[1];
				}
				counterText += ' ';
			} else {
				counterText += `${separator} `;
			}
		}

		let textArray = { text: counterText };
		let markerColor = styleStack.getProperty('markerColor');
		if (markerColor) {
			textArray.color = markerColor;
		}

		return { _inlines: this.textInlines.buildInlines(textArray, styleStack).items };
	}

	measureUnorderedList(node) {
		let style = this.styleStack.clone();
		let items = node.ul;
		node.type = node.type || 'disc';
		node._gapSize = this.gapSizeForList();
		node._minWidth = 0;
		node._maxWidth = 0;

		for (let i = 0, l = items.length; i < l; i++) {
			let item = items[i] = this.measureNode(items[i]);

			if (!item.ol && !item.ul) {
				item.listMarker = this.buildUnorderedMarker(style, node._gapSize, item.listType || node.type);
			}

			node._minWidth = Math.max(node._minWidth, items[i]._minWidth + node._gapSize.width);
			node._maxWidth = Math.max(node._maxWidth, items[i]._maxWidth + node._gapSize.width);
		}

		return node;
	}

	measureOrderedList(node) {
		let style = this.styleStack.clone();
		let items = node.ol;
		node.type = node.type || 'decimal';
		node.separator = node.separator || '.';
		node.reversed = node.reversed || false;
		if (!isNumber(node.start)) {
			node.start = node.reversed ? items.length : 1;
		}
		node._gapSize = this.gapSizeForList();
		node._minWidth = 0;
		node._maxWidth = 0;

		let counter = node.start;
		for (let i = 0, l = items.length; i < l; i++) {
			let item = items[i] = this.measureNode(items[i]);

			if (!item.ol && !item.ul) {
				let counterValue = isNumber(item.counter) ? item.counter : counter;
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

		for (let i = 0, l = items.length; i < l; i++) {
			let item = items[i];
			if (!item.ol && !item.ul) {
				item.listMarker._minWidth = item.listMarker._maxWidth = node._gapSize.width;
			}
		}

		return node;
	}

	measureColumns(node) {
		let columns = node.columns;
		node._gap = this.styleStack.getProperty('columnGap') || 0;

		for (let i = 0, l = columns.length; i < l; i++) {
			columns[i] = this.measureNode(columns[i]);
		}

		let measures = ColumnCalculator.measureMinMax(columns);

		let numGaps = (columns.length > 0) ? (columns.length - 1) : 0;
		node._minWidth = measures.min + node._gap * numGaps;
		node._maxWidth = measures.max + node._gap * numGaps;

		return node;
	}

	measureTable(node) {
		extendTableWidths(node);
		node._layout = getLayout(this.tableLayouts);
		node._offsets = getOffsets(node._layout);

		let colSpans = [];
		let col;
		let row;
		let cols;
		let rows;

		for (col = 0, cols = node.table.body[0].length; col < cols; col++) {
			let c = node.table.widths[col];
			c._minWidth = 0;
			c._maxWidth = 0;

			for (row = 0, rows = node.table.body.length; row < rows; row++) {
				let rowData = node.table.body[row];
				let data = rowData[col];
				if (data === undefined) {
					throw new Error(`Malformed table row, a cell is undefined.\nRow index: ${row}\nColumn index: ${col}\nRow data: ${stringifyNode(rowData)}`);
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

		let measures = ColumnCalculator.measureMinMax(node.table.widths);

		node._minWidth = measures.min + node._offsets.total;
		node._maxWidth = measures.max + node._offsets.total;

		return node;

		function measureCb(_this, data) {
			return () => {
				if (isObject(data)) {
					data.fillColor = _this.styleStack.getProperty('fillColor');
					data.fillOpacity = _this.styleStack.getProperty('fillOpacity');
				}
				return _this.measureNode(data);
			};
		}

		function getLayout(tableLayouts) {
			let layout = node.layout;

			if (isString(layout)) {
				layout = tableLayouts[layout];
			}

			return pack(defaultTableLayout, layout);
		}

		function getOffsets(layout) {
			let offsets = [];
			let totalOffset = 0;
			let prevRightPadding = 0;

			for (let i = 0, l = node.table.widths.length; i < l; i++) {
				let lOffset = prevRightPadding + layout.vLineWidth(i, node) + layout.paddingLeft(i, node);
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
			let q;
			let j;

			for (let i = 0, l = colSpans.length; i < l; i++) {
				let span = colSpans[i];

				let currentMinMax = getMinMax(span.col, span.span, node._offsets);
				let minDifference = span.minWidth - currentMinMax.minWidth;
				let maxDifference = span.maxWidth - currentMinMax.maxWidth;

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
			let result = { minWidth: 0, maxWidth: 0 };

			for (let i = 0; i < span; i++) {
				result.minWidth += node.table.widths[col + i]._minWidth + (i ? offsets.offsets[col + i] : 0);
				result.maxWidth += node.table.widths[col + i]._maxWidth + (i ? offsets.offsets[col + i] : 0);
			}

			return result;
		}

		function markSpans(rowData, col, span) {
			for (let i = 1; i < span; i++) {
				rowData[col + i] = {
					_span: true,
					_minWidth: 0,
					_maxWidth: 0,
					rowSpan: rowData[col].rowSpan
				};
			}
		}

		function markVSpans(table, row, col, span) {
			for (let i = 1; i < span; i++) {
				table.body[row + i][col] = {
					_span: true,
					_minWidth: 0,
					_maxWidth: 0,
					fillColor: table.body[row][col].fillColor,
					fillOpacity: table.body[row][col].fillOpacity
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

			for (let i = 0, l = node.table.widths.length; i < l; i++) {
				let w = node.table.widths[i];
				if (isNumber(w) || isString(w)) {
					node.table.widths[i] = { width: w };
				}
			}
		}
	}

	measureCanvas(node) {
		let w = 0;
		let h = 0;

		for (let i = 0, l = node.canvas.length; i < l; i++) {
			let vector = node.canvas[i];

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
					for (let i2 = 0, l2 = vector.points.length; i2 < l2; i2++) {
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
	}

	measureQr(node) {
		node = qrEncoder.measure(node);
		node._alignment = this.styleStack.getProperty('alignment');
		return node;
	}

	measureAttachment(node) {
		node._width = node.width || 7;
		node._height = node.height || 18;

		return node;
	}
}

export default DocMeasure;
