(function() {
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
		this.clear(maxWidth);
	}

	/**
	 * Removes all inlines from the Line and sets new maxWidth
	 * @param  {Number} new maximum width this line can have
	 */
	Line.prototype.clear = function(newMaxWidth) {
		this.maxWidth = newMaxWidth || this.maxWidth;
		this.inlineWidths = 0;
		this.leadingCut = 0;
		this.trailingCut = 0;
		this.newLineForced = false;
		this.inlines = [];
	};

	/**
	 * Adds an inline to the Line if there's enough space left
	 * @param {Object} inline 
	 * @return {Boolean} boolean value indicating whether inline has been added (there was enough space)
	 */
	Line.prototype.addInline = function(inline) {
		if (this.newLineForced) return false;

		if (inline.leadingCut === inline.trailingCut && inline.leadingCut === inline.width) {
			// double-trimming fix
			inline.leadingCut = 0;
			inline.trailingCut = 0;
			inline.width = 0;
		}

		var leadingCut;

		if (this.inlines.length === 0) {
			leadingCut = inline.leadingCut || 0;
		}
		else {
			leadingCut = this.leadingCut;
		}

		var trailingCut = inline.trailingCut || 0;

		if (this.inlineWidths + inline.width - leadingCut - trailingCut <= this.maxWidth || this.inlines.length === 0) {
			this.leadingCut = leadingCut;
			this.trailingCut = trailingCut;

			inline.x = this.inlineWidths - this.leadingCut;

			this.inlines.push(inline);
			this.inlineWidths += inline.width;

			if (inline.lineEnd) {
				this.newLineForced = true;
			}

			return true;
		}

		return false;
	};

	/**
	 * Returns line width for the specified maxWidth
	 * @return {Number} width of the Line
	 */
	Line.prototype.getWidth = function() {
		return this.inlineWidths - this.leadingCut - this.trailingCut;
	};

	/**
	 * Returns width of the widest inline (minimum maxWidth the Line could 
	 * have to render inlines without inner-inline splits)
	 * @return {Number} minimum width
	 */
	Line.prototype.getMinWidth = function() {
		var max = 0;
		for(var i = 0, l = this.inlines.length; i < l; i++) {
			var item = this.inlines[i];
			max = Math.max(max, (item.width || 0) - (item.leadingCut || 0) - (item.trailingCut || 0));
		}

		return max;
	};

	/**
	 * Returns line height
	 * @return {Number}
	 */
	Line.prototype.getHeight = function() {
		var max = 0;
		for(var i = 0, l = this.inlines.length; i < l; i++) {
			var item = this.inlines[i];
			max = Math.max(max, item.height || 0);
		}

		return max;
	};


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
	 * Pushes style-name or style-overrides-object onto the stack for future evaluation
	 *
	 * @param {String|Object} styleNameOrOverride style-name (referring to styleDictionary) or
	 *	                                          a new dictionary defining overriding properties
	 */
	StyleContextStack.prototype.push = function(styleNameOrOverride) {
		this.styleOverrides.push(styleNameOrOverride);
	}

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
	}

	/**
	 * Creates a set of named styles or/and a style-overrides-object based on the item,
	 * pushes those elements onto the stack for future evaluation and returns the number 
	 * of elements pushed, so they can be easily poped then.
	 * 
	 * @param {Object} item - an object with optional style property and/or style overrides
	 * @return the number of items pushed onto the stack
	 */
	StyleContextStack.prototype.autopush = function(item) {
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
			if (item[key] != undefined && item[key] != null) {
				styleOverrideObject[key] = item[key];
				pushSOO = true;
			}
		});

		if (pushSOO) {
			this.push(styleOverrideObject);
		}

		return styleNames.length + (pushSOO ? 1 : 0);
	}

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
				if (typeof item == "string" || item instanceof String) {
					// named-style-override

					var style = this.styleDictionary[item];
					if (style && style[property]) {
						return style[property];
					}
				} else {
					// style-overrides-object
					if (item[property]) {
						return item[property];
					}
				}
			}
		}

		return this.defaultStyle && this.defaultStyle[property];
	}




	////////////////////////////////////////
	// TextTools

	var TextTools = (function(){
		var WORD_RE = /([^ ,\/!.?:;\-\n]*[ ,\/!.?:;\-]*)|\n/g;
		// /\S*\s*/g to be considered (I'm not sure however - we shouldn't split "aaa !!!!")

		var LEADING = /^(\s)+/g;
		var TRAILING = /(\s)+$/g;

		/**
		 * Creates an instance of TextTools - a helper which turns text into a set of Lines
		 * 
		 * @constructor
		 * @param {FontProvider} fontProvider
		 */
		function TextTools(fontProvider) {
			this.fontProvider = fontProvider;
		}

		/**
		 * Converts an array of strings (or inline-definition-objects) into a set of Lines
		 * @param  {Object} textArray - an array of inline-definition-objects (or strings)
		 * @param  {Number} maxWidth - max width a single Line should have
		 * @return {Array} an array of Lines
		 */
		TextTools.prototype.buildLines = function(textArray, maxWidth) {
			var measured = measure(this.fontProvider, textArray/*, defaultStyle*/);

			var lines = [];

			var currentLine = new Line(maxWidth);
			lines.push(currentLine);

			var nextInline = measured.shift();

			while (nextInline) {
				if (currentLine.addInline(nextInline)) {
					nextInline = measured.shift();
				} else {
					currentLine = new Line(maxWidth);
					lines.push(currentLine);
				}
			}

			return lines;
		}

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
				};
			}
			// [ 'bold', 'italics', 'fontSize', 'font' ].forEach(function(key){
			// 	if (source[key]) {
			// 		destination[key] = source[key];
			// 	}
			// });

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

					copyStyle(style, result)

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
			if (item[property] != undefined && item[property] != null) {
				// item defines this property
				return item[property];
			}

			if (!styleContextStack) return defaultValue;

			var pushed = styleContextStack.autopush(item);
			var value = styleContextStack.getProperty(property);

			if (pushed > 0)
				styleContextStack.pop(pushed);

			if (value != null && value != undefined) {
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
				//var color = item.color || defaultStyle && defaultStyle.color || "black";

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
			})

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
	// Block

	/**
	 * Creates an instance of Block
	 * 
	 * @constructor
	 * @param {Number} maximum block width (inherited by the Lines)
	 */
	function Block(maxWidth) {
		this.maxWidth = maxWidth;
	}

	/**
	 * Returns minimum width the Block could have without inner-inline splits
	 * 
	 * @return {Number}
	 */
	Block.prototype.getMinWidth = function() {
		var max = 0;

		for (var i = 0, l = this.lines.length; i < l; i++) {
			var line = this.lines[i];
			max = Math.max(max, (line.getMinWidth() || 0));
		}

		return max;
	}

	/**
	 * Returns width of the longest Line contained within the Block
	 * @return {Number}
	 */
	Block.prototype.getWidth = function() {
		var max = 0;

		for (var i = 0, l = this.lines.length; i < l; i++) {
			var line = this.lines[i];
			max = Math.max(max, (line.getWidth() || 0));
		}

		return max;
	}

	/**
	 * Returns Block height
	 * @return {Number}
	 */
	Block.prototype.getHeight = function() {
		var sum = 0;

		for (var i = 0, l = this.lines.length; i < l; i++) {
			var line = this.lines[i];
			sum += line.getHeight() || 0;
		}

		return sum;
	}

	/**
	 * Sets the Lines, aligns them and returns overflown lines if maxHeight is specified
	 * @param {Array} lines - an array of Lines
	 * @param {String} alignment - 'left'/'right'/'center' (no support for 'justify' yet)
	 * @param {Number} maxHeight - maximum height the Block can have (if specified - overflown lines are not added to the Block, but rather - returned)
	 * @return {Array} an array containing all overflown Lines (if maxHeight was specified)
	 */
	Block.prototype.setLines = function(lines, alignment, maxHeight) {
		alignment = alignment || 'left';
		var y = 0;

		this.lines = lines;

		for(var i = 0, l = lines.length; i < l; i++) {
			var line = lines[i];

			line.y = y;
			y += line.getHeight();
			var lineWidth = line.getWidth();

			switch(alignment.toLowerCase()) {
				case 'left':
					line.x = 0;
				break;
				case 'right':
					line.x = this.maxWidth - lineWidth;
				break;
				case 'center':
					line.x = (this.maxWidth - lineWidth) / 2;
				break;
			}

			if (maxHeight && y > maxHeight) {
				return lines.splice(i);
			}
		}
	}









	////////////////////////////////////////
	// Exports

	var pdfMake = {
		Line: Line,
		TextTools: TextTools,
		Block: Block,
		StyleContextStack: StyleContextStack,
		//LayoutBuilder: LayoutBuilder
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
			window.PDFMake = pdfMake;
		}
	}
})();
