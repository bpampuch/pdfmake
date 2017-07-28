/* jslint node: true */
'use strict';

var LineBreaker = require('linebreak');

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
 * Converts an array of strings (or inline-definition-objects) into a collection
 * of inlines and calculated minWidth/maxWidth.
 * and their min/max widths
 * @param  {Object} textArray - an array of inline-definition-objects (or strings)
 * @param  {Object} styleContextStack current style stack
 * @return {Object}                   collection of inlines, minWidth, maxWidth
 */
TextTools.prototype.buildInlines = function (textArray, styleContextStack) {
	var measured = measure(this.fontProvider, textArray, styleContextStack);

	var minWidth = 0,
		maxWidth = 0,
		currentLineWidth;

	measured.forEach(function (inline) {
		minWidth = Math.max(minWidth, inline.width - inline.leadingCut - inline.trailingCut);

		if (!currentLineWidth) {
			currentLineWidth = {width: 0, leadingCut: inline.leadingCut, trailingCut: 0};
		}

		currentLineWidth.width += inline.width;
		currentLineWidth.trailingCut = inline.trailingCut;

		maxWidth = Math.max(maxWidth, getTrimmedWidth(currentLineWidth));

		if (inline.lineEnd) {
			currentLineWidth = null;
		}
	});

	if (getStyleProperty({}, styleContextStack, 'noWrap', false)) {
		minWidth = maxWidth;
	}

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
TextTools.prototype.sizeOfString = function (text, styleContextStack) {
	text = text ? text.toString().replace('\t', '    ') : '';

	//TODO: refactor - extract from measure
	var fontName = getStyleProperty({}, styleContextStack, 'font', 'Roboto');
	var fontSize = getStyleProperty({}, styleContextStack, 'fontSize', 12);
	var bold = getStyleProperty({}, styleContextStack, 'bold', false);
	var italics = getStyleProperty({}, styleContextStack, 'italics', false);
	var lineHeight = getStyleProperty({}, styleContextStack, 'lineHeight', 1);
	var characterSpacing = getStyleProperty({}, styleContextStack, 'characterSpacing', 0);

	var font = this.fontProvider.provideFont(fontName, bold, italics);

	return {
		width: widthOfString(text, font, fontSize, characterSpacing),
		height: font.lineHeight(fontSize) * lineHeight,
		fontSize: fontSize,
		lineHeight: lineHeight,
		ascender: font.ascender / 1000 * fontSize,
		descender: font.descender / 1000 * fontSize
	};
};

TextTools.prototype.widthOfString = function (text, font, fontSize, characterSpacing) {
	return widthOfString(text, font, fontSize, characterSpacing);
};

function splitWords(text, noWrap) {
	var results = [];
	text = text.replace('\t', '    ');

	if (noWrap) {
		results.push({text: text});
		return results;
	}

	var breaker = new LineBreaker(text);
	var last = 0;
	var bk;

	while (bk = breaker.nextBreak()) {
		var word = text.slice(last, bk.position);

		if (bk.required || word.match(/\r?\n$|\r$/)) { // new line
			word = word.replace(/\r?\n$|\r$/, '');
			results.push({text: word, lineEnd: true});
		} else {
			results.push({text: word});
		}

		last = bk.position;
	}

	return results;
}

function copyStyle(source, destination) {
	destination = destination || {};
	source = source || {}; //TODO: default style

	for (var key in source) {
		if (key != 'text' && source.hasOwnProperty(key)) {
			destination[key] = source[key];
		}
	}

	return destination;
}

function normalizeTextArray(array, styleContextStack) {
	var results = [];

	if (!Array.isArray(array)) {
		array = [array];
	}

	for (var i = 0, l = array.length; i < l; i++) {
		var item = array[i];
		var style = null;
		var words;

		var noWrap = getStyleProperty(item || {}, styleContextStack, 'noWrap', false);
		if (item !== null && (typeof item === 'object' || item instanceof Object)) {
			words = splitWords(normalizeString(item.text), noWrap);
			style = copyStyle(item);
		} else {
			words = splitWords(normalizeString(item), noWrap);
		}

		for (var i2 = 0, l2 = words.length; i2 < l2; i2++) {
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

function normalizeString(value) {
	if (value === undefined || value === null) {
		return '';
	} else if (typeof value === 'number') {
		return value.toString();
	} else if (typeof value === 'string' || value instanceof String) {
		return value;
	} else {
		return value.toString();
	}
}

function getStyleProperty(item, styleContextStack, property, defaultValue) {
	var value;

	if (item[property] !== undefined && item[property] !== null) {
		// item defines this property
		return item[property];
	}

	if (!styleContextStack) {
		return defaultValue;
	}

	styleContextStack.auto(item, function () {
		value = styleContextStack.getProperty(property);
	});

	if (value !== null && value !== undefined) {
		return value;
	} else {
		return defaultValue;
	}
}

function measure(fontProvider, textArray, styleContextStack) {
	var normalized = normalizeTextArray(textArray, styleContextStack);

	if (normalized.length) {
		var leadingIndent = getStyleProperty(normalized[0], styleContextStack, 'leadingIndent', 0);

		if (leadingIndent) {
			normalized[0].leadingCut = -leadingIndent;
			normalized[0].leadingIndent = leadingIndent;
		}
	}

	normalized.forEach(function (item) {
		var fontName = getStyleProperty(item, styleContextStack, 'font', 'Roboto');
		var fontSize = getStyleProperty(item, styleContextStack, 'fontSize', 12);
		var bold = getStyleProperty(item, styleContextStack, 'bold', false);
		var italics = getStyleProperty(item, styleContextStack, 'italics', false);
		var color = getStyleProperty(item, styleContextStack, 'color', 'black');
		var decoration = getStyleProperty(item, styleContextStack, 'decoration', null);
		var decorationColor = getStyleProperty(item, styleContextStack, 'decorationColor', null);
		var decorationStyle = getStyleProperty(item, styleContextStack, 'decorationStyle', null);
		var background = getStyleProperty(item, styleContextStack, 'background', null);
		var lineHeight = getStyleProperty(item, styleContextStack, 'lineHeight', 1);
		var characterSpacing = getStyleProperty(item, styleContextStack, 'characterSpacing', 0);
		var link = getStyleProperty(item, styleContextStack, 'link', null);
		var linkToPage = getStyleProperty(item, styleContextStack, 'linkToPage', null);
		var noWrap = getStyleProperty(item, styleContextStack, 'noWrap', null);
		var preserveLeadingSpaces = getStyleProperty(item, styleContextStack, 'preserveLeadingSpaces', false);

		var font = fontProvider.provideFont(fontName, bold, italics);

		item.width = widthOfString(item.text, font, fontSize, characterSpacing);
		item.height = font.lineHeight(fontSize) * lineHeight;

		var leadingSpaces = item.text.match(LEADING);

		if (!item.leadingCut) {
			item.leadingCut = 0;
		}

		if (leadingSpaces && !preserveLeadingSpaces) {
			item.leadingCut += widthOfString(leadingSpaces[0], font, fontSize, characterSpacing);
		}

		var trailingSpaces = item.text.match(TRAILING);
		if (trailingSpaces) {
			item.trailingCut = widthOfString(trailingSpaces[0], font, fontSize, characterSpacing);
		} else {
			item.trailingCut = 0;
		}

		item.alignment = getStyleProperty(item, styleContextStack, 'alignment', 'left');
		item.font = font;
		item.fontSize = fontSize;
		item.characterSpacing = characterSpacing;
		item.color = color;
		item.decoration = decoration;
		item.decorationColor = decorationColor;
		item.decorationStyle = decorationStyle;
		item.background = background;
		item.link = link;
		item.linkToPage = linkToPage;
		item.noWrap = noWrap;
	});

	return normalized;
}

function widthOfString(text, font, fontSize, characterSpacing) {
	return font.widthOfString(text, fontSize) + ((characterSpacing || 0) * (text.length - 1));
}

/****TESTS**** (add a leading '/' to uncomment)
 TextTools.prototype.splitWords = splitWords;
 TextTools.prototype.normalizeTextArray = normalizeTextArray;
 TextTools.prototype.measure = measure;
 // */


module.exports = TextTools;
