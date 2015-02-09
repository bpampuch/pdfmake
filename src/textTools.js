/* jslint node: true */
'use strict';

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
	text = text.replace('\t', '    ');

	//TODO: refactor - extract from measure
	var fontName = getStyleProperty({}, styleContextStack, 'font', 'Roboto');
	var fontSize = getStyleProperty({}, styleContextStack, 'fontSize', 12);
	var bold = getStyleProperty({}, styleContextStack, 'bold', false);
	var italics = getStyleProperty({}, styleContextStack, 'italics', false);
	var lineHeight = getStyleProperty({}, styleContextStack, 'lineHeight', 1);

	var font = this.fontProvider.provideFont(fontName, bold, italics);

	return {
		width: font.widthOfString(removeDiacritics(text), fontSize),
		height: font.lineHeight(fontSize) * lineHeight,
		fontSize: fontSize,
		lineHeight: lineHeight,
		ascender: font.ascender / 1000 * fontSize,
		decender: font.decender / 1000 * fontSize
	};
};

function splitWords(text) {
	var results = [];
	text = text.replace('\t', '    ');

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
		var decoration = getStyleProperty(item, styleContextStack, 'decoration', null);
		var decorationColor = getStyleProperty(item, styleContextStack, 'decorationColor', null);
		var decorationStyle = getStyleProperty(item, styleContextStack, 'decorationStyle', null);
		var background = getStyleProperty(item, styleContextStack, 'background', null);
		var lineHeight = getStyleProperty(item, styleContextStack, 'lineHeight', 1);

		var font = fontProvider.provideFont(fontName, bold, italics);

		// TODO: character spacing
		item.width = font.widthOfString(removeDiacritics(item.text), fontSize);
		item.height = font.lineHeight(fontSize) * lineHeight;

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
		item.decoration = decoration;
		item.decorationColor = decorationColor;
		item.decorationStyle = decorationStyle;
		item.background = background;
	});

	return normalized;
}

/****TESTS**** (add a leading '/' to uncomment)
TextTools.prototype.splitWords = splitWords;
TextTools.prototype.normalizeTextArray = normalizeTextArray;
TextTools.prototype.measure = measure;
// */


module.exports = TextTools;
