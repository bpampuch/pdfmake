'use strict';

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

Line.prototype.getAscenderHeight = function () {
	var y = 0;

	this.inlines.forEach(function (inline) {
		y = Math.max(y, inline.font.ascender / 1000 * inline.fontSize);
	});
	return y;
};

Line.prototype.hasEnoughSpaceForInline = function (inline, nextInlines) {
	nextInlines = nextInlines || [];

	if (this.inlines.length === 0) {
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

	this.inlines.forEach(function (item) {
		max = Math.max(max, item.height || 0);
	});

	return max;
};

module.exports = Line;
