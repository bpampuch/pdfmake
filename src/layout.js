(function() {
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


	var pdfMake = {
		Line: Line,
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
