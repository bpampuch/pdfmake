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

	Line.prototype.hasEnoughSpaceForInline = function(inline) {
		if (this.inlines.length === 0) return true;

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
	// LayoutBuilder

	/**
	 * Creates an instance of LayoutBuilder - layout engine which turns document-definition-object 
	 * into a set of pages, blocks, lines and inlines ready to be rendered into a PDF
	 * 
	 * @param {Object} pageSize - an object defining page width and height
	 * @param {Object} pageMargins - an object defining top, left, right and bottom margins
	 */
	function LayoutBuilder(pageSize, pageMargins) {
		this.pageSize = pageSize;
		this.pageMargins = pageMargins;
	}

	/**
	 * Executes layout engine on document-definition-object and creates an array of pages
	 * containing positioned Blocks, Lines and inlines
	 * 
	 * @param {Object} docStructure document-definition-object
	 * @param {Object} fontDescriptors dictionary with font definitions
	 * @param {Object} styleDictionary dictionary with style definitions
	 * @param {Object} defaultStyle default style definition
	 * @return {Array} an array of pages
	 */
	LayoutBuilder.prototype.layoutDocument = function (docStructure, fontDescriptors, styleDictionary, defaultStyle) {
		this.docMeasure = new DocMeasure(fontDescriptors, styleDictionary, defaultStyle);
		this.styleStack = new StyleContextStack(styleDictionary, defaultStyle);

		this.pages = [];

		this.context = [
			{
				page: -1,
				availableWidth: pageSize.width - pageMargins.left - pageMargins.right,
				availableHeight: 0
			}
		];

		this.processNode(docStructure);

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

	LayoutBuilder.prototype.getPage = function(pageNumber) {
		while(this.pages.length <= pageNumber) {
			this.pages.push({ lines: [], vectors: [] });
		}

		return this.pages[pageNumber];
	};

	LayoutBuilder.prototype.addLine = function(line) {
		var context = this.getContext();

		if(context.availableHeight < line.getHeight()) {
			context.page++;
			context.x = this.pageMargins.left;

			//TODO: table header support
			context.y = this.pageMargins.top;
			this.availableHeight = this.pageSize.height - this.pageMargins.top - this.pageMargins.bottom;
		}

		this.getPage(context.page).lines.add(line);
	};

	LayoutBuilder.prototype.processNode = function(node) {
		var self = this;

		this.styleStack.auto(node, function() {
			if/* (node.columns) {
				self._processColumns(node.columns, context);
			} else if (node.stack) {
				self._processVerticalContainer(node.stack, context);
			} else if (node.ul) {
				self._processList(false, node.ul, context);
			} else if (node.ol) {
				self._processList(true, node.ol, context);
			} else if (node.table) {
				self._processTable(node);
			} else if*/ (node.text) {
				self.processLeaf(node);
			} else {
				throw 'Unrecognized document structure: ' + node;
			}
		});
	};


	LayoutBuilder.prototype.buildNextLine = function(textNode) {
		if (!textNode.inlines || textNode.inlines.length === 0) return null;

		var line = new Line(this.getContext().availableWidth);

		while(textNode._inlines && textNode._inlines.length > 0 && line.hasEnoughSpaceForInline(textNode._inlines[0])) {
			line.addInline(textNode._inlines.shift());
		}

		return line;
	};


	LayoutBuilder.prototype.alignLine = function(line, alignment) {
		//TODO:
		line.x = this.context.x;
	};

	LayoutBuilder.prototype.processLeaf = function(node) {
		var line = this.buildNextLine(node);

		while (line) {
			this.alignLine(line, this.styleStack.getProperty('alignment') || 'left');
			this.positioner.addLine(line);
			line = this.buildNextLine(node);
		}
	};
/*
	LayoutBuilder.prototype._processVerticalContainer = function(nodes, startPosition) {
		for(var i = 0, l = nodes.length; i < l; i++) {
			startPosition = this.processNode(nodes[i], startPosition);
		}

		return startPosition;
	};
*/

	// LayoutBuilder.prototype._ensureColumnWidths = function(columns, availableWidth) {
	//	var columnsWithoutWidth = [];

	//	for(var i = 0, l = columns.length; i < l; i++) {
	//		var column = columns[i];

	//		if (typeof column == 'string' || column instanceof String) {
	//			column = columns[i] = { text: column };
	//		}

	//		if (column.width) {
	//			availableWidth -= column.width;
	//		} else {
	//			columnsWithoutWidth.push(column);
	//		}
	//	}

	//	for(var i = 0, l = columnsWithoutWidth.length; i < l; i++) {
	//		columnsWithoutWidth[i].width = availableWidth / l;
	//	}
	// };

/*

	LayoutBuilder.prototype._processColumns = function(columns, startPosition) {
		var finalPosition = startPosition;

		var columnSet = new ColumnSet(startPosition.availableWidth);
		var self = this;

		for(var i = 0, l = columns.length; i < l; i++) {
			var column = columns[i];

			if (typeof column == 'string' || column instanceof String) {
				column = columns[i] = { text: column };
			}

			columnSet.addColumn(column, column.width, processColumn);
		}

		columnSet.complete();

		return pack(startPosition, {
			page: finalPosition.page,
			y: finalPosition.y,
		});

		function processColumn(column, maxWidth) {
			self.blockTracker.createNestedLevel();

			var columnStartPosition = pack(startPosition, { availableWidth: maxWidth });

			var columnFinalPosition = self.processNode(column, columnStartPosition);

			var columnFinalY = columnFinalPosition.page * self.pageSize.height + columnFinalPosition.y;
			var finalY = finalPosition.page * self.pageSize.height + finalPosition.y;

			if (columnFinalY > finalY)
				finalPosition = columnFinalPosition;

			var realColumnWidth = self.blockTracker.getRightBoundary() - startPosition.x;
			var addedBlocks = self.blockTracker.levelUp();

			return { width: realColumnWidth, blocks: addedBlocks };
		}
	};

	LayoutBuilder.prototype._gapSizeForList = function(isOrderedList, listItems) {
		if (isOrderedList) {
			var longestNo = (listItems.length).toString().replace(/./g, '9');
			return this.textTools.sizeOfString(longestNo + '. ', this.styleStack);
		} else {
			return this.textTools.sizeOfString('oo ', this.styleStack);
		}
	};

	LayoutBuilder.prototype._getOnItemAddedCallback = function(isOrderedList, styleStack, gapSize) {
		var self = this;
		var indent = gapSize.width;

		if (isOrderedList) {
			var counter = 1;

			return function(pageNumber, page, block) {
				var lines = self.textTools.buildLines(counter.toString() + '.', null, styleStack);
				var b = new Block();
				b.setLines(lines);
				b.x = block.x - indent;
				b.y = block.y + (block.lines.length > 0 ? block.lines[0].getHeight() : block.getHeight()) - b.getHeight();

				page.blocks.push(b);

				counter++;
			};
		} else {
			var radius = gapSize.height / 6;

			return function(pageNumber, page, block) {
				page.vectors.push({
					x: block.x - indent + radius,
					y: block.y + gapSize.height * 2 / 3,
					r1: radius,
					r2: radius,
					type: 'ellipse'
				});
			};
		}
	};

	LayoutBuilder.prototype._processList = function(isOrderedList, listItems, startPosition) {
		var styleStack = this.styleStack.clone();

		var gapSize = this._gapSizeForList(isOrderedList, listItems);

		var nextItemPosition = pack(startPosition, {
			x: startPosition.x + gapSize.width,
			availableWidth: startPosition.availableWidth - gapSize.width
		});

		var addListItemMark = this._getOnItemAddedCallback(isOrderedList, styleStack, gapSize);

		for(var i = 0, l = listItems.length; i < l; i++) {
			var item = listItems[i];

			this.itemListCallback = addListItemMark;
			nextItemPosition = this.processNode(item, nextItemPosition);
		}

		return pack(startPosition, {
			page: nextItemPosition.page,
			y: nextItemPosition.y,
		});
	};

	LayoutBuilder.prototype.onBlockAdded = function(pageNumber, page, block) {
		if (this.itemListCallback) {
			this.itemListCallback(pageNumber, page, block);
			this.itemListCallback = null;
		}

		this.blockTracker.addBlock(block);
	};
*/

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
