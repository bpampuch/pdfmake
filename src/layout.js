(function() {
	/**
	 * Creates an instance of Line
	 *
	 * @constructor
	 * @this {Line}
	 * @param {[type]} Maximum width this line can have
	 */
	function Line(maxWidth) {
	}

	/**
	 * Adds an inline to the Line if there's enough space left
	 * @param {Object} inline 
	 * @return {Boolean}
	 */
	Line.prototype.addInline = function(inline) {
		return false;
	}

	/**
	 * Returns line width for the specified maxWidth
	 * @return {Number} width of the Line
	 */
	Line.prototype.getWidth = function() {
		return 0;
	}

	/**
	 * Returns width of the widest inline (minimum maxWidth the Line could 
	 * have to render inlines without inner-inline splits)
	 * @return {Number} minimum width
	 */
	Line.prototype.getMinWidth = function() {
		return 0;
	}

	/**
	 * Returns line height
	 * @return {Number}
	 */
	Line.prototype.getHeight = function() {
		return 0;
	}



	var pdfMake = {
		Line: Line,
	}

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
