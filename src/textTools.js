'use strict';

var isString = require('./helpers').isString;
var isNumber = require('./helpers').isNumber;
var isObject = require('./helpers').isObject;
var isArray = require('./helpers').isArray;
var isUndefined = require('./helpers').isUndefined;
var LineBreaker = require('@foliojs-fork/linebreak');
var Tokenizer = require('@flowaccount/node-icu-tokenizer');
var fontkit = require('fontkit');

var LEADING = /^(\s)+/g;
var TRAILING = /(\s)+$/g;

var fontCacheName = '';
var fontCache = null;
var fontSubstituteCache = {};
var defaultFont = 'Roboto';

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
	primeFontCaches.call(this, styleContextStack);

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
	text = text ? text.toString().replace(/\t/g, '    ') : '';

	//TODO: refactor - extract from measure
	var fontName = getStyleProperty({}, styleContextStack, 'font', 'Roboto');
	var fontSize = getStyleProperty({}, styleContextStack, 'fontSize', 12);
	var fontFeatures = getStyleProperty({}, styleContextStack, 'fontFeatures', null);
	var bold = getStyleProperty({}, styleContextStack, 'bold', false);
	var italics = getStyleProperty({}, styleContextStack, 'italics', false);
	var lineHeight = getStyleProperty({}, styleContextStack, 'lineHeight', 1);
	var characterSpacing = getStyleProperty({}, styleContextStack, 'characterSpacing', 0);

	var font = this.fontProvider.provideFont(fontName, bold, italics);

	return {
		width: widthOfString(text, font, fontSize, characterSpacing, fontFeatures),
		height: font.lineHeight(fontSize) * lineHeight,
		fontSize: fontSize,
		lineHeight: lineHeight,
		ascender: font.ascender / 1000 * fontSize,
		descender: font.descender / 1000 * fontSize
	};
};

/**
 * Returns size of the specified rotated string (without breaking it) using the current style
 *
 * @param  {string} text text to be measured
 * @param  {number} angle
 * @param  {object} styleContextStack current style stack
 * @returns {object} size of the specified string
 */
TextTools.prototype.sizeOfRotatedText = function (text, angle, styleContextStack) {
	var angleRad = angle * Math.PI / -180;
	var size = this.sizeOfString(text, styleContextStack);
	return {
		width: Math.abs(size.height * Math.sin(angleRad)) + Math.abs(size.width * Math.cos(angleRad)),
		height: Math.abs(size.width * Math.sin(angleRad)) + Math.abs(size.height * Math.cos(angleRad))
	};
};

TextTools.prototype.widthOfString = function (text, font, fontSize, characterSpacing, fontFeatures) {
	return widthOfString(text, font, fontSize, characterSpacing, fontFeatures);
};

function splitWords(text, noWrap) {
	var results = [];

	text = text.replace(/\t/g, '    ');
	text = text.replace(/\r/g, '');

	if (noWrap) {
		results.push({ text: text });
		return results;
	}

	var breaker = new LineBreaker(text);
	var last = 0;
	var bk;

	while ((bk = breaker.nextBreak())) {
		var word = text.slice(last, bk.position);
		var isLineEnd = bk.required || /\r?\n$|\r$/.test(word);
		var trimmed = word.trim();
		var useTokenizer = !exceptTokenizer(trimmed) && needsTokenizer(trimmed);

		if (!useTokenizer) {
			var output = word;
			if (isLineEnd) {
				output = output.replace(/\r?\n$|\r$/, '');
			}
			results.push({ text: output, lineEnd: isLineEnd });
		} else {
			var tokenWord = tokenizerWords(word);
			for (var tIndex = 0; tIndex < tokenWord.length; tIndex++) {
				var token = tokenWord[tIndex];
				if (!token || token.del) {
					continue;
				}

				var tokenText = token.token;
				var tokenResult = { text: tokenText };

				if (tokenText === '\n') {
					tokenResult.lineEnd = true;
					tokenResult.text = '';
				} else if (isLineEnd && tIndex === tokenWord.length - 1) {
					tokenResult.text = tokenText.replace(/\r?\n$|\r$/, '');
					tokenResult.lineEnd = true;
				}

				results.push(tokenResult);
			}
		}

		last = bk.position;
	}

	return results;
}

function tokenizerWords(word) {
	var regex = / /;
	word = word.replace(regex, '[BLANK]');

	var tokenizer = new Tokenizer().tokenize(word, { ignoreWhitespaceTokens: false });

	for (var i = 0; i < tokenizer.length; i++) {
		if (tokenizer[i] && tokenizer[i].token === '[' &&
			tokenizer[i + 1] && tokenizer[i + 1].token === 'BLANK' &&
			tokenizer[i + 2] && tokenizer[i + 2].token === ']') {
			tokenizer[i].token = ' ';
			tokenizer[i + 1].del = true;
			tokenizer[i + 2].del = true;
		}
	}

	return tokenizer;
}

function copyStyle(source, destination) {
	destination = destination || {};
	source = source || {}; //TODO: default style

	for (var key in source) {
		if (key !== 'text' && Object.prototype.hasOwnProperty.call(source, key)) {
			destination[key] = source[key];
		}
	}

	return destination;
}

function normalizeTextArray(array, styleContextStack) {
	function flatten(target) {
		return target.reduce(function (prev, cur) {
			var current = isObject(cur) && isArray(cur.text) ? flatten(cur.text) : cur;
			var more = [].concat(current).some(Array.isArray);
			return prev.concat(more ? flatten(current) : current);
		}, []);
	}

	function getOneWord(index, words, noWrap) {
		if (isUndefined(words[index])) {
			return null;
		}

		if (words[index].lineEnd) {
			return null;
		}

		var word = words[index].text;

		if (noWrap) {
			var tmpWords = splitWords(normalizeString(word), false);
			if (isUndefined(tmpWords[tmpWords.length - 1])) {
				return null;
			}
			word = tmpWords[tmpWords.length - 1].text;
		}

		return word;
	}

	var results = [];

	if (!isArray(array)) {
		array = [array];
	}

	array = flatten(array);

	var lastWord = null;
	for (var i = 0, l = array.length; i < l; i++) {
		var item = array[i];
		var style = null;
		var words;

		var noWrap = getStyleProperty(item || {}, styleContextStack, 'noWrap', false);
		if (isObject(item)) {
			if (item._textRef && item._textRef._textNodeRef && item._textRef._textNodeRef.text) {
				item.text = item._textRef._textNodeRef.text;
			}
			words = splitWords(normalizeString(item.text), noWrap);
			style = copyStyle(item);
		} else {
			words = splitWords(normalizeString(item), noWrap);
		}

		if (lastWord && words.length) {
			var firstWord = getOneWord(0, words, noWrap);
			var wrapWords = splitWords(normalizeString(lastWord + firstWord), false);
			if (wrapWords.length === 1) {
				results[results.length - 1].noNewLine = true;
			}
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

		lastWord = null;
		if (i + 1 < l) {
			lastWord = getOneWord(words.length - 1, words, noWrap);
		}
	}

	return results;
}

function normalizeString(value) {
	if (value === undefined || value === null) {
		return '';
	} else if (isNumber(value)) {
		return value.toString();
	} else if (isString(value)) {
		return value;
	} else {
		return value.toString();
	}
}

function getStyleProperty(item, styleContextStack, property, defaultValue) {
	var value;

	if (item && item[property] !== undefined && item[property] !== null) {
		// item defines this property
		return item[property];
	}

	if (!styleContextStack || typeof styleContextStack.auto !== 'function') {
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
		var fontName = getFontCompaitible(item);
		var fontSize = getStyleProperty(item, styleContextStack, 'fontSize', 12);
		var fontFeatures = getStyleProperty(item, styleContextStack, 'fontFeatures', null);
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
		var linkToDestination = getStyleProperty(item, styleContextStack, 'linkToDestination', null);
		var noWrap = getStyleProperty(item, styleContextStack, 'noWrap', null);
		var preserveLeadingSpaces = getStyleProperty(item, styleContextStack, 'preserveLeadingSpaces', false);
		var preserveTrailingSpaces = getStyleProperty(item, styleContextStack, 'preserveTrailingSpaces', false);
		var opacity = getStyleProperty(item, styleContextStack, 'opacity', 1);
		var sup = getStyleProperty(item, styleContextStack, 'sup', false);
		var sub = getStyleProperty(item, styleContextStack, 'sub', false);

		if ((sup || sub) && item.fontSize === undefined) {
			// font size reduction taken from here: https://en.wikipedia.org/wiki/Subscript_and_superscript#Desktop_publishing
			fontSize *= 0.58;
		}

		var font = fontProvider.provideFont(fontName, bold, italics);

		item.width = widthOfString(item.text, font, fontSize, characterSpacing, fontFeatures);
		item.height = font.lineHeight(fontSize) * lineHeight;

		if (!item.leadingCut) {
			item.leadingCut = 0;
		}

		var leadingSpaces;
		if (!preserveLeadingSpaces && (leadingSpaces = item.text.match(LEADING))) {
			item.leadingCut += widthOfString(leadingSpaces[0], font, fontSize, characterSpacing, fontFeatures);
		}

		var trailingSpaces;
		if (!preserveTrailingSpaces && (trailingSpaces = item.text.match(TRAILING))) {
			item.trailingCut = widthOfString(trailingSpaces[0], font, fontSize, characterSpacing, fontFeatures);
		} else if (item.trailingCut === undefined) {
			item.trailingCut = 0;
		}

		item.alignment = getStyleProperty(item, styleContextStack, 'alignment', 'left');
		item.font = font;
		item.fontSize = fontSize;
		item.fontFeatures = fontFeatures;
		item.characterSpacing = characterSpacing;
		item.color = color;
		item.decoration = decoration;
		item.decorationColor = decorationColor;
		item.decorationStyle = decorationStyle;
		item.background = background;
		item.link = link;
		item.linkToPage = linkToPage;
		item.linkToDestination = linkToDestination;
		item.noWrap = noWrap;
		item.opacity = opacity;
		item.sup = sup;
		item.sub = sub;
	});

	return normalized;
}

function widthOfString(text, font, fontSize, characterSpacing, fontFeatures) {
	return font.widthOfString(text, fontSize, fontFeatures) + ((characterSpacing || 0) * (text.length - 1));
}

function exceptTokenizer(word) {
	var listExceptWord = [
		'(ไทยแลนด์)',
		'(ประเทศไทย)',
		'(สำนักงานใหญ่)',
		'(มหาชน)',
		'(Thailand)',
		'(Main Branch)',
		'(Head office)',
		'(กรุ๊ป)'
	];

	return listExceptWord.indexOf(word) > -1;
}

function needsTokenizer(word) {
	if (!word) {
		return false;
	}

	return /[\u0E00-\u0E7F]/.test(word);
}

function primeFontCaches(styleContextStack) {
	if (styleContextStack && typeof styleContextStack.getProperty === 'function') {
		var stackFont = styleContextStack.getProperty('font');
		if (stackFont) {
			defaultFont = stackFont;
		}
	}

	if (!defaultFont) {
		defaultFont = 'Roboto';
	}

	if (!this.fontProvider || !this.fontProvider.fonts) {
		return;
	}

	if (defaultFont && fontCacheName !== defaultFont) {
		var defaultFontDef = this.fontProvider.fonts[defaultFont];
		var primaryFont = safeOpenFont(defaultFontDef && defaultFontDef.normal);

		if (primaryFont) {
			fontCacheName = defaultFont;
			fontCache = primaryFont;
		} else {
			fontCacheName = '';
			fontCache = null;
		}
	}

	for (var fontItem in this.fontProvider.fonts) {
		if (!Object.prototype.hasOwnProperty.call(this.fontProvider.fonts, fontItem)) {
			continue;
		}

		if (fontItem === fontCacheName) {
			continue;
		}

		if (!fontSubstituteCache[fontItem]) {
			var substitute = safeOpenFont(this.fontProvider.fonts[fontItem].normal);
			if (substitute) {
				fontSubstituteCache[fontItem] = { Name: fontItem, FontObj: substitute };
			}
		}
	}
}

function getFontCompaitible(item) {
	var text = item.text || '';

	if (fontCacheName && fontCache && !hasMissingGlyphs(fontCache.glyphsForString(text))) {
		return fontCacheName;
	}

	for (var key in fontSubstituteCache) {
		if (!Object.prototype.hasOwnProperty.call(fontSubstituteCache, key)) {
			continue;
		}

		var fontItem = fontSubstituteCache[key];
		if (!fontItem || !fontItem.FontObj || fontItem.Name === fontCacheName) {
			continue;
		}

		if (!hasMissingGlyphs(fontItem.FontObj.glyphsForString(text))) {
			return fontItem.Name;
		}
	}

	return defaultFont || 'Roboto';
}

function hasMissingGlyphs(glyphList) {
	for (var i = 0; i < glyphList.length; i++) {
		if (!glyphList[i] || glyphList[i].id <= 0) {
			return true;
		}
	}
	return false;
}

function safeOpenFont(path) {
	if (!path) {
		return null;
	}

	try {
		return fontkit.openSync(path);
	} catch (error) {
		void error;
		return null;
	}
}

module.exports = TextTools;
