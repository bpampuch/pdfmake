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
	// TextTools

	var TextTools = (function(){
		var WORD_RE = /([^ ,\/!.?:;\-\n]*[ ,\/!.?:;\-]*)|\n/g;
		var LEADING = /^(\s)+/g;
		var TRAILING = /(\s)+$/g;

		/**
		 * Creates an instance of TextTools - a helper which turns text into a set of Lines
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

			[ 'bold', 'italics', 'fontSize', 'font' ].forEach(function(key){
				if (source[key]) {
					destination[key] = source[key];
				}
			});

			return destination;
		}

		function normalizeTextArray(array) {
			var results = [];

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

		function measure(fontProvider, textArray, defaultStyle) {
			var normalized = normalizeTextArray(textArray);

			normalized.forEach(function(item) {
				var fontName = item.font || defaultStyle && defaultStyle.font || 'Roboto';
				var fontSize = item.fontSize || defaultStyle && defaultStyle.fontSize || 12;
				//var color = item.color || defaultStyle && defaultStyle.color || "black";

				var font = fontProvider.provideFont(fontName, item.bold, item.italics);

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
	// Exports

	var pdfMake = {
		Line: Line,
		TextTools: TextTools,
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
