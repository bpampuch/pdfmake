///TODO: refactor i zmiana algorytmow
/// 1/ posrednia struktura zawierajaca poziomy zagniezdzen i logiczne kontenery z mozliwoscia 
///    offsetowania w poziomie, lub wrecz jawnego ustawiania x
/// 2/ druga metoda traversujaca po strukturze na potrzeby pomiarow (min/max), tylko mierzy inline'y
///    nieco slabo ze dwa razy sa inline'y mierzone, fajniej gdyby nie bylo takiej potrzeby, ale
///    to by wymagalo modyfikacji struktur zrodlowych... ?moze to nie jest takie glupie?
/// 
/// traversal idzie i robi
/// - measure inlines + calculate min/max dla kazdego elementu w strukturze zrodlowej
/// 
/// drugi przebieg idzie tak samo i ustawia juz konkretne szerokosci, z algorytmem budujacym
/// bloki i dzielacym je na strony, gdy zajdzie taka potrzeba, ale nic poza tym... juz nie mierzy
/// inline'ow, zwraca jedynie faktyczna pozycje rozpoczecia, oraz zakonczenia
/// przy dzieleniu na strony uwzglednia koniecznosc dorysowania naglowkow tabelek

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

		['font', 'fontSize', 'bold', 'italics', 'alignment'].forEach(function(key) {
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
				height: font.lineHeight(fontSize)
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
		var diacriticsMap = { 'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z', 'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z'};

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
				//var color = item.color || defaultStyle && defaultStyle.color || 'black';

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

				item.font = font;
				item.fontSize = fontSize;
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

		// measure
		var self = this;

		return this.styleStack.auto(node, function() {
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
			} else {
				throw 'Unrecognized document structure: ' + node;
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
			return this.textTools.sizeOfString('oo ', this.styleStack);
		}
	};

	DocMeasure.prototype.measureList = function(isOrdered, node) {
		var items = isOrdered ? node.ol : node.ul;

		node._gapSize = this.gapSizeForList(isOrdered, items);
		node._minWidth = 0;
		node._maxWidth = 0;

		for(var i = 0, l = items.length; i < l; i++) {
			items[i] = this.measureNode(items[i]);

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
					node.table.widths.push(node.table.widths[0]);
				}
			}

			for(var i = 0, l = node.table.widths.length; i < l; i++) {
				var w = node.table.widths[i];
				if (typeof w === 'number' || w instanceof Number || typeof w === 'string' || w instanceof String) {
					node.table.widths[i] = { _desiredWidth: w };
				}
			}
		}
	};

	////////////////////////////////////////
	// Exports

	var pdfMake = {
//		Line: Line,
		TextTools: TextTools,
//		Block: Block,
		StyleContextStack: StyleContextStack,
		DocMeasure: DocMeasure,
		LayoutBuilder: LayoutBuilder,
//		ColumnSet: ColumnSet,
//		BlockSet: BlockSet
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
