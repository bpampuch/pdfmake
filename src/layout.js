(function() {
	'use strict';

	////////////////////////////////////////
	// StyleContextStack

	/**
	 * Creates an instance of StyleContextStack used for style inheritance and style overrides
	 *
	 * @constructor
	 * @this {StyleContextStack}
	 * @param {Object} named styles dictionary
	 * @param {Object} optional default style definition
	 */
	function StyleContextStack (styleDictionary, defaultStyle) {
		this.defaultStyle = defaultStyle || {};
		this.styleDictionary = styleDictionary;
		this.styleOverrides = [];
	}

	/**
	 * Creates cloned version of current stack
	 * @return {StyleContextStack} current stack snapshot
	 */
	StyleContextStack.prototype.clone = function() {
		var stack = new StyleContextStack(this.styleDictionary, this.defaultStyle);

		this.styleOverrides.forEach(function(item) {
			stack.styleOverrides.push(item);
		});

		return stack;
	};

	/**
	 * Pushes style-name or style-overrides-object onto the stack for future evaluation
	 *
	 * @param {String|Object} styleNameOrOverride style-name (referring to styleDictionary) or
	 *                                            a new dictionary defining overriding properties
	 */
	StyleContextStack.prototype.push = function(styleNameOrOverride) {
		this.styleOverrides.push(styleNameOrOverride);
	};

	/**
	 * Removes last style-name or style-overrides-object from the stack
	 *
	 * @param {Number} howMany - optional number of elements to be popped (if not specified,
	 *                           one element will be removed from the stack)
	 */
	StyleContextStack.prototype.pop = function(howMany) {
		howMany = howMany || 1;

		while(howMany-- > 0) {
			this.styleOverrides.pop();
		}
	};

	/**
	 * Creates a set of named styles or/and a style-overrides-object based on the item,
	 * pushes those elements onto the stack for future evaluation and returns the number
	 * of elements pushed, so they can be easily poped then.
	 *
	 * @param {Object} item - an object with optional style property and/or style overrides
	 * @return the number of items pushed onto the stack
	 */
	StyleContextStack.prototype.autopush = function(item) {
		if (typeof item === 'string' || item instanceof String) return 0;

		var styleNames = [];

		if (item.style) {
			if (item.style instanceof Array) {
				styleNames = item.style;
			} else {
				styleNames = [ item.style ];
			}
		}

		for(var i = 0, l = styleNames.length; i < l; i++) {
			this.push(styleNames[i]);
		}

		var styleOverrideObject = {};
		var pushSOO = false;

		[
			'font',
			'fontSize',
			'bold',
			'italics',
			'alignment',
			'color',
			'cellBorder',
			'headerCellBorder',
			'oddRowCellBorder',
			'evenRowCellBorder',
			'tableBorder'
		].forEach(function(key) {
			if (item[key] !== undefined && item[key] !== null) {
				styleOverrideObject[key] = item[key];
				pushSOO = true;
			}
		});

		if (pushSOO) {
			this.push(styleOverrideObject);
		}

		return styleNames.length + (pushSOO ? 1 : 0);
	};

	/**
	 * Automatically pushes elements onto the stack, using autopush based on item,
	 * executes callback and then pops elements back. Returns value returned by callback
	 *
	 * @param  {Object}   item - an object with optional style property and/or style overrides
	 * @param  {Function} function to be called between autopush and pop
	 * @return {Object} value returned by callback
	 */
	StyleContextStack.prototype.auto = function(item, callback) {
		var pushedItems = this.autopush(item);
		var result = callback();

		if (pushedItems > 0) {
			this.pop(pushedItems);
		}

		return result;
	};

	/**
	 * Evaluates stack and returns value of a named property
	 *
	 * @param {String} property - property name
	 * @return property value or null if not found
	 */
	StyleContextStack.prototype.getProperty = function(property) {
		if (this.styleOverrides) {
			for(var i = this.styleOverrides.length - 1; i >= 0; i--) {
				var item = this.styleOverrides[i];

				if (typeof item == 'string' || item instanceof String) {
					// named-style-override

					var style = this.styleDictionary[item];
					if (style && style[property] !== null && style[property] !== undefined) {
						return style[property];
					}
				} else {
					// style-overrides-object
					if (item[property] !== undefined && item[property] !== null) {
						return item[property];
					}
				}
			}
		}

		return this.defaultStyle && this.defaultStyle[property];
	};


	////////////////////////////////////////
	// TextTools

	var TextTools = (function(){
		var WORD_RE = /([^ ,\/!.?:;\-\n]*[ ,\/!.?:;\-]*)|\n/g;
		// /\S*\s*/g to be considered (I'm not sure however - we shouldn't split 'aaa !!!!')

		var LEADING = /^(\s)+/g;
		var TRAILING = /(\s)+$/g;

		/**
		 * Creates an instance of TextTools - text measurement utility
		 *
		 * @constructor
		 * @param {FontProvider} fontProvider
		 */
		function TextTools(fontProvider) {
			this.fontProvider = fontProvider;
		}

		/**
		 * Converts an array of strings (or inline-definition-objects) into a set of inlines
		 * and their min/max widths
		 * @param  {Object} textArray - an array of inline-definition-objects (or strings)
		 * @param  {Number} maxWidth - max width a single Line should have
		 * @return {Array} an array of Lines
		 */
		TextTools.prototype.buildInlines = function(textArray, styleContextStack) {
			var measured = measure(this.fontProvider, textArray, styleContextStack);

			var minWidth = 0,
				maxWidth = 0,
				currentLineWidth;

			measured.forEach(function (inline) {
				minWidth = Math.max(minWidth, inline.width - inline.leadingCut - inline.trailingCut);

				if (!currentLineWidth) {
					currentLineWidth = { width: 0, leadingCut: inline.leadingCut, trailingCut: 0 };
				}

				currentLineWidth.width += inline.width;
				currentLineWidth.trailingCut = inline.trailingCut;

				maxWidth = Math.max(maxWidth, getTrimmedWidth(currentLineWidth));

				if (inline.lineEnd) {
					currentLineWidth = null;
				}
			});

			return {
				items: measured,
				minWidth: minWidth,
				maxWidth: maxWidth
			};

			function getTrimmedWidth(item) {
				return Math.max(0, item.width - item.leadingCut - item.trailingCut);
			}
		};

		/**
		 * Returns size of the specified string (without breaking it) using the current style
		 * @param  {String} text              text to be measured
		 * @param  {Object} styleContextStack current style stack
		 * @return {Object}                   size of the specified string
		 */
		TextTools.prototype.sizeOfString = function(text, styleContextStack) {
			//TODO: refactor - extract from measure
			var fontName = getStyleProperty({}, styleContextStack, 'font', 'Roboto');
			var fontSize = getStyleProperty({}, styleContextStack, 'fontSize', 12);
			var bold = getStyleProperty({}, styleContextStack, 'bold', false);
			var italics = getStyleProperty({}, styleContextStack, 'italics', false);

			var font = this.fontProvider.provideFont(fontName, bold, italics);

			return {
				width: font.widthOfString(removeDiacritics(text), fontSize),
				height: font.lineHeight(fontSize),
				fontSize: fontSize,
				ascender: font.ascender / 1000 * fontSize,
				decender: font.decender / 1000 * fontSize
			};
		};

		function splitWords(text) {
			var results = [];

			var array = text.match(WORD_RE);

			// i < l - 1, because the last match is always an empty string
			// other empty strings however are treated as new-lines
			for(var i = 0, l = array.length; i < l - 1; i++) {
				var item = array[i];

				var isNewLine = item.length === 0;

				if (!isNewLine) {
					results.push({text: item});
				}
				else {
					var shouldAddLine = (results.length === 0 || results[results.length - 1].lineEnd);

					if (shouldAddLine) {
						results.push({ text: '', lineEnd: true });
					}
					else {
						results[results.length - 1].lineEnd = true;
					}
				}
			}

			return results;
		}

		function copyStyle(source, destination) {
			destination = destination || {};
			source = source || {}; //TODO: default style

			for(var key in source) {
				if (key != 'text' && source.hasOwnProperty(key)) {
					destination[key] = source[key];
				}
			}

			return destination;
		}

		function normalizeTextArray(array) {
			var results = [];

			if (typeof array == 'string' || array instanceof String) {
				array = [ array ];
			}

			for(var i = 0, l = array.length; i < l; i++) {
				var item = array[i];
				var style = null;
				var words;

				if (typeof item == 'string' || item instanceof String) {
					words = splitWords(item);
				} else {
					words = splitWords(item.text);
					style = copyStyle(item);
				}

				for(var i2 = 0, l2 = words.length; i2 < l2; i2++) {
					var result = {
						text: words[i2].text
					};

					if (words[i2].lineEnd) {
						result.lineEnd = true;
					}

					copyStyle(style, result);

					results.push(result);
				}
			}

			return results;
		}

		//TODO: support for other languages (currently only polish is supported)
		var diacriticsMap = { 'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z', 'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z' };
		// '  << atom.io workaround

		function removeDiacritics(text) {
			return text.replace(/[^A-Za-z0-9\[\] ]/g, function(a) {
				return diacriticsMap[a] || a;
			});
		}


		function getStyleProperty(item, styleContextStack, property, defaultValue) {
			var value;

			if (item[property] !== undefined && item[property] !== null) {
				// item defines this property
				return item[property];
			}

			if (!styleContextStack) return defaultValue;

			styleContextStack.auto(item, function() {
				value = styleContextStack.getProperty(property);
			});

			if (value !== null && value !== undefined) {
				return value;
			} else {
				return defaultValue;
			}
		}

		function measure(fontProvider, textArray, styleContextStack) {
			var normalized = normalizeTextArray(textArray);

			normalized.forEach(function(item) {
				var fontName = getStyleProperty(item, styleContextStack, 'font', 'Roboto');
				var fontSize = getStyleProperty(item, styleContextStack, 'fontSize', 12);
				var bold = getStyleProperty(item, styleContextStack, 'bold', false);
				var italics = getStyleProperty(item, styleContextStack, 'italics', false);
				var color = getStyleProperty(item, styleContextStack, 'color', 'black');

				var font = fontProvider.provideFont(fontName, bold, italics);

				// TODO: character spacing
				item.width = font.widthOfString(removeDiacritics(item.text), fontSize);
				item.height = font.lineHeight(fontSize);

				var leadingSpaces = item.text.match(LEADING);
				var trailingSpaces = item.text.match(TRAILING);
				if (leadingSpaces) {
					item.leadingCut = font.widthOfString(leadingSpaces[0], fontSize);
				}
				else {
					item.leadingCut = 0;
				}

				if (trailingSpaces) {
					item.trailingCut = font.widthOfString(trailingSpaces[0], fontSize);
				}
				else {
					item.trailingCut = 0;
				}

				item.alignment = getStyleProperty(item, styleContextStack, 'alignment', 'left');
				item.font = font;
				item.fontSize = fontSize;
				item.color = color;
			});

			return normalized;
		}

		//****TESTS**** (remove first '/' to comment)
		TextTools.prototype.splitWords = splitWords;
		TextTools.prototype.normalizeTextArray = normalizeTextArray;
		TextTools.prototype.measure = measure;
		// */

		return TextTools;
	})();


	////////////////////////////////////////
	// DocMeasure

	/**
	 * @private
	 */
	function DocMeasure(fontProvider, styleDictionary, defaultStyle) {
		this.textTools = new TextTools(fontProvider);
		this.styleStack = new StyleContextStack(styleDictionary, defaultStyle);
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

		var self = this;

		return this.styleStack.auto(node, function() {
			// TODO: refactor + rethink whether this is the proper way to handle margins
			if (!node.margin && node.style) {
				var style = self.styleStack.styleDictionary[node.style];
				if (style && style.margin) {
					node.margin = style.margin;
				}
			}

			if (node.columns) {
				return self.measureColumns(node);
			} else if (node.stack) {
				return self.measureVerticalContainer(node);
			} else if (node.ul) {
				return self.measureList(false, node);
			} else if (node.ol) {
				return self.measureList(true, node);
			} else if (node.table) {
				return self.measureTable(node);
			} else if (node.text) {
				return self.measureLeaf(node);
			} else if (node.canvas) {
				return self.measureCanvas(node);
			} else {
				throw 'Unrecognized document structure: ' + JSON.stringify(node, fontStringify);
			}
		});
	};

	DocMeasure.prototype.measureLeaf = function(node) {
		var data = this.textTools.buildInlines(node.text, this.styleStack);

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

	DocMeasure.prototype.measureColumns = function(node) {
		var columns = node.columns;
		node._minWidth = 0;
		node._maxWidth = 0;

		for(var i = 0, l = columns.length; i < l; i++) {
			columns[i] = this.measureNode(columns[i]);

			node._minWidth += columns[i]._minWidth;
			node._maxWidth += columns[i]._maxWidth;
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
					y: gapSize.height + gapSize.decender - gapSize.fontSize / 3,//0,// gapSize.fontSize * 2 / 3,
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

	DocMeasure.prototype.measureTable = function(node) {
		extendTableWidths(node);

		node.table._minWidth = 0;
		node.table._maxWidth = 0;

		for(var col = 0, cols = node.table.body[0].length; col < cols; col++) {
			node.table.widths[col]._minWidth = 0;
			node.table.widths[col]._maxWidth = 0;

			for(var row = 0, rows = node.table.body.length; row < rows; row++) {
				node.table.body[row][col] = this.measureNode(node.table.body[row][col]);

				node.table.widths[col]._minWidth = Math.max(node.table.widths[col]._minWidth, node.table.body[row][col]._minWidth);
				node.table.widths[col]._maxWidth = Math.max(node.table.widths[col]._maxWidth, node.table.body[row][col]._maxWidth);
			}

			node.table._minWidth += node.table.widths[col]._minWidth;
			node.table._maxWidth += node.table.widths[col]._maxWidth;
		}

		return node;

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

	////////////////////////////////////////
	// Line

	/**
	 * Creates an instance of Line
	 *
	 * @constructor
	 * @this {Line}
	 * @param {Number} Maximum width this line can have
	 */
	function Line(maxWidth) {
		this.maxWidth = maxWidth;
		this.leadingCut = 0;
		this.trailingCut = 0;
		this.inlineWidths = 0;
		this.inlines = [];
	}

	Line.prototype.getAscenderHeight = function() {
		var y = 0;

		this.inlines.forEach(function(inline) {
			y = Math.max(y, inline.font.ascender / 1000 * inline.fontSize);
		});
		return y;
	};

	Line.prototype.hasEnoughSpaceForInline = function(inline) {
		if (this.inlines.length === 0) return true;
		if (this.newLineForced) return false;

		return this.inlineWidths + inline.width - this.leadingCut - (inline.trailingCut || 0) <= this.maxWidth;
	};

	Line.prototype.addInline = function(inline) {
		if (this.inlines.length === 0) {
			this.leadingCut = inline.leadingCut || 0;
		}
		this.trailingCut = inline.trailingCut || 0;

		inline.x = this.inlineWidths - this.leadingCut;

		this.inlines.push(inline);
		this.inlineWidths += inline.width;

		if (inline.lineEnd) {
			this.newLineForced = true;
		}
	};

	Line.prototype.getWidth = function() {
		return this.inlineWidths - this.leadingCut - this.trailingCut;
	};

	/**
	 * Returns line height
	 * @return {Number}
	 */
	Line.prototype.getHeight = function() {
		var max = 0;

		this.inlines.forEach(function(item) {
			max = Math.max(max, item.height || 0);
		});

		return max;
	};


	////////////////////////////////////////
	// TraversalTracker

	/**
	 * Creates an instance of TraversalTracker
	 *
	 * @constructor
	 */
	function TraversalTracker() {
		this.events = {};
	}

	TraversalTracker.prototype.startTracking = function(event, cb) {
		var callbacks = (this.events[event] || (this.events[event] = []));

		if (callbacks.indexOf(cb) < 0) {
			callbacks.push(cb);
		}
	};

	TraversalTracker.prototype.stopTracking = function(event, cb) {
		var callbacks = this.events[event];

		if (callbacks) {
			var index = callbacks.indexOf(cb);
			if (index >= 0) {
				callbacks.splice(index, 1);
			}
		}
	};

	TraversalTracker.prototype.emit = function(event) {
		var args = Array.prototype.slice.call(arguments, 1);

		var callbacks = this.events[event];

		if (callbacks) {
			callbacks.forEach(function(cb) {
				cb.apply(this, args);
			});
		}
	};

	TraversalTracker.prototype.auto = function(event, cb, innerBlock) {
		this.startTracking(event, cb);
		innerBlock();
		this.stopTracking(event, cb);
	};


	////////////////////////////////////////
	// DocumentContext

	/**
	 * Creates an instance of DocumentContext - a store for current x, y positions and available width/height.
	 * It facilitates column divisions and vertical sync
	 */
	function DocumentContext(pageSize, pageMargins) {
		this.pages = [];

		this.pageSize = pageSize;
		this.pageMargins = pageMargins;

		this.x = pageMargins.left;
		this.availableWidth = pageSize.width - pageMargins.left - pageMargins.right;
		this.availableHeight = 0;
		this.page = -1;

		this.snapshots = [];
	}

	DocumentContext.prototype.beginColumnGroup = function() {
		this.snapshots.push({
			x: this.x,
			y: this.y,
			availableHeight: this.availableHeight,
			availableWidth: this.availableWidth,
			page: this.page,
			bottomMost: { y: this.y, page: this.page }
		});
	};

	DocumentContext.prototype.nextColumn = function(offset) {
		offset = offset || 0;

		var saved = this.snapshots[this.snapshots.length - 1];
		saved.bottomMost = bottomMostContext(this, saved.bottomMost);

		this.page = saved.page;
		this.x = this.x + offset;
		this.y = saved.y;
		this.availableWidth = saved.availableWidth - offset;
		this.availableHeight = saved.availableHeight;
	};

	DocumentContext.prototype.completeColumnGroup = function() {
		var saved = this.snapshots.pop();
		var bottomMost = bottomMostContext(this, saved.bottomMost);

		this.x = saved.x;
		this.y = bottomMost.y;
		this.page = bottomMost.page;
		this.availableWidth = saved.availableWidth;
		this.availableHeight = bottomMost.availableHeight;
	};

	DocumentContext.prototype.addMargin = function(left, right) {
		this.x += left;
		this.availableWidth -= left + (right || 0);
	};

	DocumentContext.prototype.moveDown = function(offset) {
		this.y += offset;
		this.availableHeight -= offset;

		return this.availableHeight > 0;
	};

	DocumentContext.prototype.moveToPageTop = function() {
		this.y = this.pageMargins.top;
		this.availableHeight = this.pageSize.height - this.pageMargins.top - this.pageMargins.bottom;
	};

	DocumentContext.prototype.addPage = function() {
		var page = { lines: [], vectors: [] };
		this.pages.push(page);
		this.page = this.pages.length - 1;
		this.moveToPageTop();

		return page;
	};

	DocumentContext.prototype.getCurrentPage = function() {
		if (this.page < 0 || this.page >= this.pages.length) return null;

		return this.pages[this.page];
	};

	DocumentContext.prototype.createUnbreakableSubcontext = function() {
		var height = this.pageSize.height - this.pageMargins.top - this.pageMargins.bottom;
		var width = this.availableWidth;

		var ctx = new DocumentContext({ width: width, height: height }, { left: 0, right: 0, top: 0, bottom: 0 });
		ctx.addPage();

		return ctx;
	};

	function bottomMostContext(c1, c2) {
		var r;

		if (c1.page > c2.page) r = c1;
		else if (c2.page > c1.page) r = c2;
		else r = (c1.y > c2.y) ? c1 : c2;

		return {
			page: r.page,
			x: r.x,
			y: r.y,
			availableHeight: r.availableHeight,
			availableWidth: r.availableWidth
		};
	}

	//****TESTS**** (remove first '/' to comment)
	DocumentContext.bottomMostContext = bottomMostContext;
	// */


	////////////////////////////////////////
	// ElementWriter

	/**
	* Creates an instance of ElementWriter - a line/vector writer, which adds
	* elements to current page and sets their positions based on the context
	*/
	function ElementWriter(context) {
		this.setContext(context);
	}

	ElementWriter.prototype.setContext = function(context) {
		this.context = context;
	};

	ElementWriter.prototype.addLine = function(line) {
		var height = line.getHeight();
		var context = this.context;
		var page = context.getCurrentPage();

		if (context.availableHeight < height || !page) {
			return false;
		}

		line.x = context.x;
		line.y = context.y;

		this.alignLine(line);

		page.lines.push(line);

		context.moveDown(height);

		return true;
	};

	ElementWriter.prototype.alignLine = function(line) {
		var width = this.context.availableWidth;
		var lineWidth = line.getWidth();

		var alignment = line.inlines && line.inlines.length > 0 && line.inlines[0].alignment;

		var offset = 0;
		switch(alignment) {
			case 'right':
				offset = width - lineWidth;
				break;
			case 'center':
				offset = (width - lineWidth) / 2;
				break;
		}

		if (offset) {
			line.x = (line.x || 0) + offset;
		}

		if (alignment === 'justify' &&
			!line.newLineForced &&
			!line.lastLineInParagraph &&
			line.inlines.length > 1) {
			var additionalSpacing = (width - lineWidth) / (line.inlines.length - 1);

			for(var i = 1, l = line.inlines.length; i < l; i++) {
				offset = i * additionalSpacing;

				line.inlines[i].x += offset;
			}
		}
	};

	ElementWriter.prototype.addVector = function(vector) {
		var context = this.context;
		var page = context.getCurrentPage();

		if (page) {
			offsetVector(vector, context.x, context.y);
			page.vectors.push(vector);

			return true;
		}
	};

	ElementWriter.prototype.addFragment = function(block) {
		var ctx = this.context;
		var page = ctx.getCurrentPage();

		if (block.height > ctx.availableHeight) return false;

		block.lines.forEach(function(line) {
			var l = pack(line);

			l.x = (l.x || 0) + ctx.x;
			l.y = (l.y || 0) + ctx.y;

			page.lines.push(l);
		});

		block.vectors.forEach(function(vector) {
			var v = pack(vector);

			offsetVector(v, ctx.x, ctx.y);
			page.vectors.push(v);
		});

		ctx.moveDown(block.height);

		return true;
	};

	function offsetVector(vector, x, y) {
		switch(vector.type) {
		case 'ellipse':
		case 'rect':
			vector.x += x;
			vector.y += y;
			break;
		case 'line':
			vector.x1 += x;
			vector.x2 += x;
			vector.y1 += y;
			vector.y2 += y;
			break;
		case 'polyline':
			for(var i = 0, l = vector.points.length; i < l; i++) {
				vector.points[i].x += x;
				vector.points[i].y += y;
			}
			break;
		}
	}

	////////////////////////////////////////
	// PageElementWriter

	/**
	* Creates an instance of PageElementWriter - line/vector writer
	* used by LayoutBuilder.
	*
	* It creates new pages when required, supports repeatable fragments
	* (ie. table headers), headers and footers.
	*/
	function PageElementWriter(context) {
		this.context = context;
		this.transactionLevel = 0;
		this.repeatables = [];

		this.writer = new ElementWriter(context);
	}

	PageElementWriter.prototype.addLine = function(line) {
		if (!this.writer.addLine(line)) {
			this._moveToPage(this.context.page + 1);
			this.writer.addLine(line);
		}
	};

	PageElementWriter.prototype.addVector = function(vector) {
		this.writer.addVector(vector);
	};

	PageElementWriter.prototype.addFragment = function(fragment) {
		if (!this.writer.addFragment(fragment)) {
			this._moveToPage(this.context.page + 1);
			this.writer.addFragment(fragment);
		}
	};

	PageElementWriter.prototype._moveToPage = function(pageIndex) {
		while (pageIndex >= this.context.pages.length) {
			// create new Page
			var page = { lines: [], vectors: [] };
			this.context.page = pageIndex;
			this.context.moveToPageTop();
			this.context.pages.push(page);

			// add repeatable fragments
			for(var i = 0, l = this.repeatables.length; i < l; i++) {
				var rep = this.repeatables[i];
				this.writer.addFragment(rep);
			}

			// add header/footer
		}

		this.writer.setContext(this.context);
	};

	PageElementWriter.prototype.beginUnbreakableBlock = function() {
		if (this.transactionLevel++ === 0) {
			this.transactionContext = this.context.createUnbreakableSubcontext();
			this.writer.setContext(this.transactionContext);
		}
	};

	PageElementWriter.prototype.commitUnbreakableBlock = function() {
		if (--this.transactionLevel === 0) {
			this.writer.setContext(this.context);

			if(this.transactionContext.pages.length > 0) {
				// no support for multi-page unbreakableBlocks
				var fragment = this.transactionContext.pages[0];

				//TODO: vectors can influence height in some situations
				fragment.height = this.transactionContext.y;

				this.addFragment(fragment);
			}
		}
	};

	PageElementWriter.prototype.pushCurrentBlockStateToRepeatables = function() {
		var rep = { lines: [], vectors: [] };

		this.transactionContext.pages[0].lines.forEach(function(line) {
			rep.lines.push(line);
		});

		this.transactionContext.pages[0].vectors.forEach(function(vector) {
			rep.vectors.push(vector);
		});

		//TODO: vectors can influence height in some situations
		rep.height = this.transactionContext.y;

		this.repeatables.push(rep);
	};

	PageElementWriter.prototype.popFromRepeatables = function() {
		this.repeatables.pop();
	};


	////////////////////////////////////////
	// Column Calculator

	/**
	* Calculates column widths
	* @private
	*/
	var ColumnCalculator = {
		buildColumnWidths: function(columns, availableWidth) {
			var autoColumns = [],
				autoMin = 0, autoMax = 0,
				starColumns = [],
				starMaxMin = 0,
				starMaxMax = 0,
				fixedColumns = [];

			columns.forEach(function(column) {
				if (isAutoColumn(column)) {
					autoColumns.push(column);
					autoMin += column._minWidth;
					autoMax += column._maxWidth;
				} else if (isStarColumn(column)) {
					starColumns.push(column);
					starMaxMin = Math.max(starMaxMin, column._minWidth);
					starMaxMax = Math.max(starMaxMax, column._maxWidth);
				} else {
					fixedColumns.push(column);
				}
			});

			fixedColumns.forEach(function(col) {
				if (col.width < col._minWidth && col.elasticWidth) {
					col._calcWidth = col._minWidth;
				} else {
					col._calcWidth = col.width;
				}

				availableWidth -= col._calcWidth;
			});

			// http://www.freesoft.org/CIE/RFC/1942/18.htm
			// http://www.w3.org/TR/CSS2/tables.html#width-layout
			// http://dev.w3.org/csswg/css3-tables-algorithms/Overview.src.htm
			var minW = autoMin + starMaxMin * starColumns.length;
			var maxW = autoMax + starMaxMax * starColumns.length;
			if (minW >= availableWidth) {
				// case 1 - there's no way to fit all columns within available width
				// that's actually pretty bad situation with PDF as we have no horizontal scroll
				// no easy workaround (unless we decide, in the future, to split single words)
				// currently we simply use minWidths for all columns
				autoColumns.forEach(function(col) {
					col._calcWidth = col._minWidth;
				});

				starColumns.forEach(function(col) {
					col._calcWidth = starMaxMin;
				});
			} else {
				if (maxW < availableWidth) {
					// case 2 - we can fit rest of the table within available space
					autoColumns.forEach(function(col) {
						col._calcWidth = col._maxWidth;
						availableWidth -= col._calcWidth;
					});
				} else {
					// maxW is too large, but minW fits within available width
					var W = availableWidth - minW;
					var D = maxW - minW;

					autoColumns.forEach(function(col) {
						var d = col._maxWidth - col._minWidth;
						col._calcWidth = col._minWidth + d * W / D;
						availableWidth -= col._calcWidth;
					});
				}

				if (starColumns.length > 0) {
					var starSize = availableWidth / starColumns.length;

					starColumns.forEach(function(col) {
						col._calcWidth = starSize;
					});
				}
			}

			function isAutoColumn(column) {
				return column.width === 'auto';
			}

			function isStarColumn(column) {
				return column.width === null || column.width === undefined || column.width === '*' || column.width === 'star';
			}
		}
	};


	////////////////////////////////////////
	// LayoutBuilder

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

		this.pages = [];
		this.context = [
			{
				page: -1,
				x: this.pageMargins.left,
				y: this.pageMargins.top,
				availableWidth: this.pageSize.width - this.pageMargins.left - this.pageMargins.right,
				availableHeight: 0
			}
		];

		this.processNode({ stack: docStructure });

		return this.pages;
	};

	LayoutBuilder.prototype.getContext = function() {
		return this.context[this.context.length - 1];
	};

	LayoutBuilder.prototype.pushContext = function() {
		this.context.push(pack(this.getContext()));
	};

	LayoutBuilder.prototype.popContext = function() {
		this.context.pop();
	};

	LayoutBuilder.prototype.moveContextToNextPage = function(ctx) {
		var context = ctx || this.getContext();

		context.page++;

		//TODO: table header support
		context.y = this.pageMargins.top;
		context.availableHeight = this.pageSize.height - this.pageMargins.top - this.pageMargins.bottom;
	};

	LayoutBuilder.prototype.getPage = function(pageNumber) {
		while(this.pages.length <= pageNumber) {
			this.pages.push({ lines: [], vectors: [] });
		}

		return this.pages[pageNumber];
	};

	LayoutBuilder.prototype.offsetY = function(height, moveToNextPageIfRequired) {
		var cc = this.getContext();

		cc.y += height;
		cc.availableHeight -= height;

		if (cc.availableHeight < 0 && moveToNextPageIfRequired) {
			this.moveContextToNextPage(cc);

			cc.y += height;
			cc.availableHeight -= height;
		}
	};

	LayoutBuilder.prototype.doHorizontalMargin = function(left, right) {
		var cc = this.getContext();
		cc.x += left;
		cc.availableWidth -= left + right;
	};

	LayoutBuilder.prototype.undoHorizontalMargin = function(left, right) {
		var cc = this.getContext();
		cc.x -= left;
		cc.availableWidth += left + right;
	};

	function getMargin(node, side, arrayCb) {
		if (!node.margin) return 0;

		if (typeof node.margin === 'number' || node.margin instanceof Number) {
			return node.margin;
		}

		if (node.margin instanceof Array) {
			return arrayCb(node.margin);
		}

		return 0;
	}

	function getTopMargin(node) {
		return getMargin(node, 'Top', function(margin) { return margin[1]; });
	}

	function getBottomMargin(node) {
		return getMargin(node, 'Bottom', function(margin) { return margin.length === 2 ? margin[1] : margin[3]; } );
	}

	function getLeftMargin(node) {
		return getMargin(node, 'Left', function(margin) { return margin[0]; });
	}

	function getRightMargin(node) {
		return getMargin(node, 'Right', function(margin) { return margin.length === 2 ? margin[0] : margin[2]; });
	}

	LayoutBuilder.prototype.processNode = function(node) {
		this.offsetY(getTopMargin(node), true);
		this.doHorizontalMargin(getLeftMargin(node), getRightMargin(node));

		if (node.stack) {
			this.processVerticalContainer(node.stack);
		} else if (node.columns) {
			this.processColumns(node.columns);
		} else if (node.ul) {
			this.processList(false, node.ul, node._gapSize);
		} else if (node.ol) {
			this.processList(true, node.ol, node._gapSize);
		} else if (node.table) {
			this.processTable(node);
		} else if (node.text) {
			this.processLeaf(node);
		} else if (node.canvas) {
			this.processCanvas(node);
		} else {
			throw 'Unrecognized document structure: ' + JSON.stringify(node, fontStringify);
		}

		this.undoHorizontalMargin(getLeftMargin(node), getRightMargin(node));
		this.offsetY(getBottomMargin(node));
	};

	function fontStringify(key, val) {
		if (key === 'font') {
			return 'font';
		}
		return val;
	}

	LayoutBuilder.prototype.processLeaf = function(node) {
		var line = this.buildNextLine(node);

		while (line) {
			this.addLine(line);

			this.tracker.emit('lineAdded', line);

			line = this.buildNextLine(node);
		}
	};

	LayoutBuilder.prototype.processList = function(orderedList, items, gapSize) {
		var self = this;
		var currentContext = this.getContext();

		this.pushContext();
		var context = this.getContext();

		context.x += gapSize.width;
		context.availableWidth -= gapSize.width;

		var nextMarker;
		this.tracker.auto('lineAdded', addMarkerToFirstLeaf, function() {
			items.forEach(function(item) {
				nextMarker = item.listMarker;
				self.processNode(item);
			});
		});

		this.popContext();

		currentContext.page = context.page;
		currentContext.y = context.y;
		currentContext.availableHeight = context.availableHeight;

		function addMarkerToFirstLeaf(line) {
			if (nextMarker) {
				var currentPage = self.getPage(self.getContext().page);

				if (nextMarker.canvas) {
					offsetVector(nextMarker.canvas[0], line.x - nextMarker._minWidth, line.y);
					currentPage.vectors.push(nextMarker.canvas[0]);
				} else {
					var markerLine = new Line(self.pageSize.width);
					markerLine.addInline(nextMarker._inlines[0]);
					markerLine.x = line.x - nextMarker._minWidth;
					markerLine.y = line.y + line.getAscenderHeight() - markerLine.getAscenderHeight();
					currentPage.lines.push(markerLine);
				}
				nextMarker = null;
			}
		}
	};

	LayoutBuilder.prototype.buildNextLine = function(textNode) {
		if (!textNode._inlines || textNode._inlines.length === 0) return null;

		var line = new Line(this.getContext().availableWidth);

		while(textNode._inlines && textNode._inlines.length > 0 && line.hasEnoughSpaceForInline(textNode._inlines[0])) {
			line.addInline(textNode._inlines.shift());
		}

		line.lastLineInParagraph = textNode._inlines.length === 0;
		return line;
	};

	LayoutBuilder.prototype.addLine = function(line) {
		var context = this.getContext();
		var lineHeight = line.getHeight();

		if(context.availableHeight < lineHeight) {
			this.moveContextToNextPage(context);
		}

		line.x = context.x;
		line.y = context.y;

		this.alignLine(line);

		context.availableHeight -= lineHeight;
		context.y += lineHeight;

		this.getPage(context.page).lines.push(line);
	};

	LayoutBuilder.prototype.alignLine = function(line) {
		var width = this.getContext().availableWidth;
		var lineWidth = line.getWidth();

		var alignment = line.inlines && line.inlines.length > 0 && line.inlines[0].alignment;

		var offset = 0;
		switch(alignment) {
			case 'right':
				offset = width - lineWidth;
				break;
			case 'center':
				offset = (width - lineWidth) / 2;
				break;
		}

		if (offset) {
			line.x = (line.x || 0) + offset;
		}

		if (alignment === 'justify' &&
			!line.newLineForced &&
			!line.lastLineInParagraph &&
			line.inlines.length > 1) {
			var additionalSpacing = (width - lineWidth) / (line.inlines.length - 1);

			for(var i = 1, l = line.inlines.length; i < l; i++) {
				offset = i * additionalSpacing;

				line.inlines[i].x += offset;
			}
		}
	};

	LayoutBuilder.prototype.processVerticalContainer = function(items) {
		var self = this;
		items.forEach(function(item) {
			self.processNode(item);
		});
	};

	LayoutBuilder.prototype.buildColumnWidths = function(columns) {
		var availableWidth = this.getContext().availableWidth;

		var autoColumns = [],
			autoMin = 0, autoMax = 0,
			starColumns = [],
			starMaxMin = 0,
			starMaxMax = 0,
			fixedColumns = [];

		columns.forEach(function(column) {
			if (isAutoColumn(column)) {
				autoColumns.push(column);
				autoMin += column._minWidth;
				autoMax += column._maxWidth;
			} else if (isStarColumn(column)) {
				starColumns.push(column);
				starMaxMin = Math.max(starMaxMin, column._minWidth);
				starMaxMax = Math.max(starMaxMax, column._maxWidth);
			} else {
				fixedColumns.push(column);
			}
		});

		fixedColumns.forEach(function(col) {
			if (col.width < col._minWidth && col.elasticWidth) {
				col._calcWidth = col._minWidth;
			} else {
				col._calcWidth = col.width;
			}

			availableWidth -= col._calcWidth;
		});

		// http://www.freesoft.org/CIE/RFC/1942/18.htm
		// http://www.w3.org/TR/CSS2/tables.html#width-layout
		// http://dev.w3.org/csswg/css3-tables-algorithms/Overview.src.htm
		var minW = autoMin + starMaxMin * starColumns.length;
		var maxW = autoMax + starMaxMax * starColumns.length;
		if (minW >= availableWidth) {
			// case 1 - there's no way to fit all columns within available width
			// that's actually pretty bad situation with PDF as we have no horizontal scroll
			// no easy workaround (unless we decide, in the future, to split single words)
			// currently we simply use minWidths for all columns
			autoColumns.forEach(function(col) {
				col._calcWidth = col._minWidth;
			});

			starColumns.forEach(function(col) {
				col._calcWidth = starMaxMin;
			});
		} else {
			if (maxW < availableWidth) {
				// case 2 - we can fit rest of the table within available space
				autoColumns.forEach(function(col) {
					col._calcWidth = col._maxWidth;
					availableWidth -= col._calcWidth;
				});
			} else {
				// maxW is too large, but minW fits within available width
				var W = availableWidth - minW;
				var D = maxW - minW;

				autoColumns.forEach(function(col) {
					var d = col._maxWidth - col._minWidth;
					col._calcWidth = col._minWidth + d * W / D;
					availableWidth -= col._calcWidth;
				});
			}

			if (starColumns.length > 0) {
				var starSize = availableWidth / starColumns.length;

				starColumns.forEach(function(col) {
					col._calcWidth = starSize;
				});
			}
		}

		function isAutoColumn(column) {
			return column.width === 'auto';
		}

		function isStarColumn(column) {
			return column.width === null || column.width === undefined || column.width === '*' || column.width === 'star';
		}
	};

	LayoutBuilder.prototype.getBottomMostContext = function(context1, context2) {
		if (!context1) return context2;
		if (!context2) return context1;

		var h1 = context1.page * this.pageSize.height + context1.y;
		var h2 = context2.page * this.pageSize.height + context2.y;
		return (h1 > h2) ? context1 : context2;
	};

	function getTableWidth(tableNode) {
		var width = 0;

		tableNode.table.widths.forEach(function(w) {
			width += w._calcWidth;
		});

		return width;
	}

	LayoutBuilder.prototype.processTable = function(tableNode) {
		this.buildColumnWidths(tableNode.table.widths);
		var tableWidth = getTableWidth(tableNode);
		//TODO: header on following pages

		// top line
		this.addHorizontalLine(0, tableWidth, 1);

		for(var i = 0, l = tableNode.table.body.length; i < l; i++) {
			this.processRow(tableNode.table.body[i], tableNode.table.widths);
			this.addHorizontalLine(0, tableWidth, 1);
		}

		// bottom line
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

	LayoutBuilder.prototype.processColumns = function(columns) {
		this.buildColumnWidths(columns);
		this.processRow(columns);
	};

	LayoutBuilder.prototype.processRow = function(columns, widths) {
		if (!widths) {
			widths = columns;
		}

		var xOffset = 0;
		var bottomMostContext;

		for(var i = 0, l = columns.length; i < l; i++) {
			var column = columns[i];

			this.pushContext();
			var context = this.getContext();
			context.availableWidth = widths[i]._calcWidth;
			context.x += xOffset;

			this.processNode(column);

			xOffset += widths[i]._calcWidth;

			bottomMostContext = this.getBottomMostContext(bottomMostContext, context);
			this.popContext();
		}

		var cc = this.getContext();
		if (bottomMostContext) {
			cc.page = bottomMostContext.page;
			cc.y = bottomMostContext.y;
			cc.availableHeight = bottomMostContext.availableHeight;
		}
	};

	LayoutBuilder.prototype.processCanvas = function(node) {
		var context = this.getContext();
		var height = node._minHeight;

		if (context.availableHeight < height) {
			// TODO: support for canvas larger than a page
			// TODO: support for other overflow methods

			this.moveContextToNextPage(context);
		}

		var page = this.getPage(context.page);

		node.canvas.forEach(function(vector) {
			offsetVector(vector, context.x, context.y);
			page.vectors.push(vector);
		});

		context.y += height;
	};


	function pack() {
		var result = {};

		for(var i = 0, l = arguments.length; i < l; i++) {
			var obj = arguments[i];

			if (obj) {
				for(var key in obj) {
					if (obj.hasOwnProperty(key)) {
						result[key] = obj[key];
					}
				}
			}
		}

		return result;
	}









	////////////////////////////////////////
	// Exports

	var pdfMake = {
		Line: Line,
		TextTools: TextTools,
		StyleContextStack: StyleContextStack,
		DocMeasure: DocMeasure,
		LayoutBuilder: LayoutBuilder,
		DocumentContext: DocumentContext,
		ElementWriter: ElementWriter,
		PageElementWriter: PageElementWriter,
		ColumnCalculator: ColumnCalculator
	};

	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		module.exports = pdfMake;
	}
	else {
		if (typeof define === 'function' && define.amd) {
			define([], function() {
				return pdfMake;
			});
		}
		else {
			window.PDFMake = window.PDFMake || {};
			window.PDFMake.layout = pdfMake;
		}
	}
})();
