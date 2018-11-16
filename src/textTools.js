'use strict';

const isString = require('./helpers').isString;
const isNumber = require('./helpers').isNumber;
const isObject = require('./helpers').isObject;
const isArray = require('./helpers').isArray;
const isUndefined = require('./helpers').isUndefined;
const LineBreaker = require('linebreak');

const LEADING = /^(\s)+/g;
const TRAILING = /(\s)+$/g;

function splitWords(text, noWrap) {
	const results = [];
	text = text.replace(/\t/g, '    ');

	if (noWrap) {
		results.push({text: text});
		return results;
	}

	const breaker = new LineBreaker(text);
	let last = 0;
	let bk;

	while (bk = breaker.nextBreak()) {
		let word = text.slice(last, bk.position);

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

	for (let key in source) {
		if (key != 'text' && source.hasOwnProperty(key)) {
			destination[key] = source[key];
		}
	}

	return destination;
}

function normalizeTextArray(array, styleContextStack) {
	function flatten(array) {
		return array.reduce(function (prev, cur) {
			const current = isArray(cur.text) ? flatten(cur.text) : cur;
			const more = [].concat(current).some(Array.isArray);
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

		let word = words[index].text;

		if (noWrap) {
			const tmpWords = splitWords(normalizeString(word), false);
			if (isUndefined(tmpWords[tmpWords.length - 1])) {
				return null;
			}
			word = tmpWords[tmpWords.length - 1].text;
		}

		return word;
	}

	const results = [];

	if (!isArray(array)) {
		array = [array];
	}

	array = flatten(array);

	let lastWord = null;
	for (let i = 0, l = array.length; i < l; i++) {
		const item = array[i];
		let style = null;
		let words;

		const noWrap = getStyleProperty(item || {}, styleContextStack, 'noWrap', false);
		if (isObject(item)) {
			if (item._textRef && item._textRef._textNodeRef.text) {
				item.text = item._textRef._textNodeRef.text;
			}
			words = splitWords(normalizeString(item.text), noWrap);
			style = copyStyle(item);
		} else {
			words = splitWords(normalizeString(item), noWrap);
		}

		if (lastWord && words.length) {
			const firstWord = getOneWord(0, words, noWrap);

			const wrapWords = splitWords(normalizeString(lastWord + firstWord), false);
			if (wrapWords.length === 1) {
				results[results.length - 1].noNewLine = true;
			}
		}

		for (let i2 = 0, l2 = words.length; i2 < l2; i2++) {
			const result = {
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
	let value;

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
	const normalized = normalizeTextArray(textArray, styleContextStack);

	if (normalized.length) {
		const leadingIndent = getStyleProperty(normalized[0], styleContextStack, 'leadingIndent', 0);

		if (leadingIndent) {
			normalized[0].leadingCut = -leadingIndent;
			normalized[0].leadingIndent = leadingIndent;
		}
	}

	normalized.forEach(function (item) {
		const fontName = getStyleProperty(item, styleContextStack, 'font', 'Roboto');
		const fontSize = getStyleProperty(item, styleContextStack, 'fontSize', 12);
		const fontFeatures = getStyleProperty(item, styleContextStack, 'fontFeatures', null);
		const bold = getStyleProperty(item, styleContextStack, 'bold', false);
		const italics = getStyleProperty(item, styleContextStack, 'italics', false);
		const color = getStyleProperty(item, styleContextStack, 'color', 'black');
		const decoration = getStyleProperty(item, styleContextStack, 'decoration', null);
		const decorationColor = getStyleProperty(item, styleContextStack, 'decorationColor', null);
		const decorationStyle = getStyleProperty(item, styleContextStack, 'decorationStyle', null);
		const background = getStyleProperty(item, styleContextStack, 'background', null);
		const lineHeight = getStyleProperty(item, styleContextStack, 'lineHeight', 1);
		const characterSpacing = getStyleProperty(item, styleContextStack, 'characterSpacing', 0);
		const link = getStyleProperty(item, styleContextStack, 'link', null);
		const linkToPage = getStyleProperty(item, styleContextStack, 'linkToPage', null);
		const noWrap = getStyleProperty(item, styleContextStack, 'noWrap', null);
		const preserveLeadingSpaces = getStyleProperty(item, styleContextStack, 'preserveLeadingSpaces', false);
		const preserveTrailingSpaces = getStyleProperty(item, styleContextStack, 'preserveTrailingSpaces', false);

		const font = fontProvider.provideFont(fontName, bold, italics);

		item.width = widthOfString(item.text, font, fontSize, characterSpacing, fontFeatures);
		item.height = font.lineHeight(fontSize) * lineHeight;

		if (!item.leadingCut) {
			item.leadingCut = 0;
		}

		let leadingSpaces;
		if (!preserveLeadingSpaces && (leadingSpaces = item.text.match(LEADING))) {
			item.leadingCut += widthOfString(leadingSpaces[0], font, fontSize, characterSpacing, fontFeatures);
		}

		let trailingSpaces;
		if (!preserveTrailingSpaces && (trailingSpaces = item.text.match(TRAILING))) {
			item.trailingCut = widthOfString(trailingSpaces[0], font, fontSize, characterSpacing, fontFeatures);
		} else {
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
		item.noWrap = noWrap;
	});

	return normalized;
}

function widthOfString(text, font, fontSize, characterSpacing, fontFeatures) {
	return font.widthOfString(text, fontSize, fontFeatures) + ((characterSpacing || 0) * (text.length - 1));
}

class TextTools {
	/**
	 * Creates an instance of TextTools - text measurement utility
	 *
	 * @constructor
	 * @param {FontProvider} fontProvider
	 */
	constructor(fontProvider) {
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
	buildInlines(textArray, styleContextStack) {
		const measured = measure(this.fontProvider, textArray, styleContextStack);
	
		let minWidth = 0,
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
	}
	/**
	 * Returns size of the specified string (without breaking it) using the current style
	 * @param  {String} text              text to be measured
	 * @param  {Object} styleContextStack current style stack
	 * @return {Object}                   size of the specified string
	 */
	sizeOfString(text, styleContextStack) {
		text = text ? text.toString().replace(/\t/g, '    ') : '';
	
		//TODO: refactor - extract from measure
		const fontName = getStyleProperty({}, styleContextStack, 'font', 'Roboto');
		const fontSize = getStyleProperty({}, styleContextStack, 'fontSize', 12);
		const fontFeatures = getStyleProperty({}, styleContextStack, 'fontFeatures', null);
		const bold = getStyleProperty({}, styleContextStack, 'bold', false);
		const italics = getStyleProperty({}, styleContextStack, 'italics', false);
		const lineHeight = getStyleProperty({}, styleContextStack, 'lineHeight', 1);
		const characterSpacing = getStyleProperty({}, styleContextStack, 'characterSpacing', 0);
	
		const font = this.fontProvider.provideFont(fontName, bold, italics);
	
		return {
			width: widthOfString(text, font, fontSize, characterSpacing, fontFeatures),
			height: font.lineHeight(fontSize) * lineHeight,
			fontSize: fontSize,
			lineHeight: lineHeight,
			ascender: font.ascender / 1000 * fontSize,
			descender: font.descender / 1000 * fontSize
		};
	}

	widthOfString(text, font, fontSize, characterSpacing, fontFeatures) {
		return widthOfString(text, font, fontSize, characterSpacing, fontFeatures);
	}
}

module.exports = TextTools;
