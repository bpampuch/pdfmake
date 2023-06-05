'use strict';

/**
 * Creates an instance of Line
 *
 * @constructor
 * @this {Line}
 * @param {Number} Maximum width this line can have
 */
function Line(maxWidth, direction = 'ltr') {
	this.maxWidth = maxWidth;
	this.direction = direction;
	this.leadingCut = 0;
	this.trailingCut = 0;
	this.inlineWidths = 0;
	this.inlineRTLRegex = /^[\u0600-\u07BF\u0860-\u08FF]/;
	this._inlines = [];
	this._isInlinesXUpToDate = true;
}

Line.prototype.getAscenderHeight = function () {
	var y = 0;

	this._inlines.forEach(function (inline) {
		y = Math.max(y, inline.font.ascender / 1000 * inline.fontSize);
	});
	return y;
};

Line.prototype.hasEnoughSpaceForInline = function (inline, nextInlines) {
	nextInlines = nextInlines || [];

	if (this._inlines.length === 0) {
		return true;
	}
	if (this.newLineForced) {
		return false;
	}

	var inlineWidth = inline.width;
	var inlineTrailingCut = inline.trailingCut || 0;
	if (inline.noNewLine) {
		for (var i = 0, l = nextInlines.length; i < l; i++) {
			var nextInline = nextInlines[i];
			inlineWidth += nextInline.width;
			inlineTrailingCut += nextInline.trailingCut || 0;
			if (!nextInline.noNewLine) {
				break;
			}
		}
	}

	return (this.inlineWidths + inlineWidth - this.leadingCut - inlineTrailingCut) <= this.maxWidth;
};

Line.prototype.addInline = function (inline) {
	if (this._inlines.length === 0) {
		this.leadingCut = inline.leadingCut || 0;
	}
	this.trailingCut = inline.trailingCut || 0;

	var isRTLInline = inline.text.match(this.inlineRTLRegex);
	var isRTLDirection = this.direction === 'rtl';

	if (isRTLDirection) {
		if (isRTLInline) {
			// rtl direction & rtl inline.
			this._inlines.unshift(inline);
		} else {
			// rtl direction & ltr inline.
			var inlineIndex = 0;
			for(var i = 0; i < this._inlines.length; i++) {
				if (!this._inlines[i].text.match(this.inlineRTLRegex)) {
					inlineIndex = i + 1;
				} else {
					break;
				}
			}

			this._inlines.splice(inlineIndex, 0, inline);
		}
	} else {
		if (isRTLInline) {
			// ltr direction & rtl inline.
			var inlineIndex = this._inlines.length;
			for(var i = this._inlines.length - 1; i >= 0; i--) {
				if (this._inlines[i].text.match(this.inlineRTLRegex)) {
					inlineIndex = i;
				} else {
					break;
				}
			}

			this._inlines.splice(inlineIndex, 0, inline);
		} else {
			// ltr direction & ltr inline.
			this._inlines.push(inline);
		}
	}

	this.inlineWidths += inline.width;

	if (inline.lineEnd) {
		this.newLineForced = true;
	}

	this._isInlinesXUpToDate = false;
};

Line.prototype.getWidth = function () {
	return this.inlineWidths - this.leadingCut - this.trailingCut;
};

Line.prototype.getAvailableWidth = function () {
	return this.maxWidth - this.getWidth();
};

/**
 * Returns line height
 * @return {Number}
 */
Line.prototype.getHeight = function () {
	var max = 0;

	this._inlines.forEach(function (item) {
		max = Math.max(max, item.height || 0);
	});

	return max;
};

Object.defineProperty(Line.prototype, "inlines", {
    get: function inlines() {
		if (!this._isInlinesXUpToDate) {
			// recalculate .x for each inline.
			var inlineWidths = 0;
			for (var i = 0; i < this._inlines.length; i++) {
				this._inlines[i].x = inlineWidths - this.leadingCut;
				inlineWidths += this._inlines[i].width;
			}

			this._isInlinesXUpToDate = true;
		}

        return this._inlines;
    }
});

module.exports = Line;
