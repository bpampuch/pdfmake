import {isString, isNumber, isObject, isArray, isUndefined} from './helpers';
import LineBreaker from 'linebreak';

let LEADING = /^(\s)+/g;
let TRAILING = /(\s)+$/g;

/**
 * Text measurement utility
 */
class TextTools {

	/**
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
		let measured = measure(this.fontProvider, textArray, styleContextStack);

		let minWidth = 0;
		let maxWidth = 0;
		let currentLineWidth;

		measured.forEach((inline) => {
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
		let fontName = getStyleProperty({}, styleContextStack, 'font', 'Roboto');
		let fontSize = getStyleProperty({}, styleContextStack, 'fontSize', 12);
		let fontFeatures = getStyleProperty({}, styleContextStack, 'fontFeatures', null);
		let bold = getStyleProperty({}, styleContextStack, 'bold', false);
		let italics = getStyleProperty({}, styleContextStack, 'italics', false);
		let lineHeight = getStyleProperty({}, styleContextStack, 'lineHeight', 1);
		let characterSpacing = getStyleProperty({}, styleContextStack, 'characterSpacing', 0);

		let font = this.fontProvider.provideFont(fontName, bold, italics);

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

function splitWords(text, noWrap) {
	let results = [];
	text = text.replace(/\t/g, '    ');

	if (noWrap) {
		results.push({text: text});
		return results;
	}

	let breaker = new LineBreaker(text);
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

function copyStyle(source = {}, destination = {}) {
	//TODO: default style for source variable

	for (let key in source) {
		if (key != 'text' && source.hasOwnProperty(key)) {
			destination[key] = source[key];
		}
	}

	return destination;
}

function normalizeTextArray(array, styleContextStack) {
	function flatten(array) {
		return array.reduce((prev, cur) => {
			let current = isArray(cur.text) ? flatten(cur.text) : cur;
			let more = [].concat(current).some(Array.isArray);
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
			let tmpWords = splitWords(normalizeString(word), false);
			if (isUndefined(tmpWords[tmpWords.length - 1])) {
				return null;
			}
			word = tmpWords[tmpWords.length - 1].text;
		}

		return word;
	}

	let results = [];

	if (!isArray(array)) {
		array = [array];
	}

	array = flatten(array);

	let lastWord = null;
	for (let i = 0, l = array.length; i < l; i++) {
		let item = array[i];
		let style = null;
		let words;

		let noWrap = getStyleProperty(item || {}, styleContextStack, 'noWrap', false);
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
			let firstWord = getOneWord(0, words, noWrap);

			let wrapWords = splitWords(normalizeString(lastWord + firstWord), false);
			if (wrapWords.length === 1) {
				results[results.length - 1].noNewLine = true;
			}
		}


		for (let i2 = 0, l2 = words.length; i2 < l2; i2++) {
			let result = {
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

	styleContextStack.auto(item, () => {
		value = styleContextStack.getProperty(property);
	});

	if (value !== null && value !== undefined) {
		return value;
	} else {
		return defaultValue;
	}
}

function measure(fontProvider, textArray, styleContextStack) {
	let normalized = normalizeTextArray(textArray, styleContextStack);

	if (normalized.length) {
		let leadingIndent = getStyleProperty(normalized[0], styleContextStack, 'leadingIndent', 0);

		if (leadingIndent) {
			normalized[0].leadingCut = -leadingIndent;
			normalized[0].leadingIndent = leadingIndent;
		}
	}

	normalized.forEach(item => {
		let fontName = getStyleProperty(item, styleContextStack, 'font', 'Roboto');
		let fontSize = getStyleProperty(item, styleContextStack, 'fontSize', 12);
		let fontFeatures = getStyleProperty(item, styleContextStack, 'fontFeatures', null);
		let bold = getStyleProperty(item, styleContextStack, 'bold', false);
		let italics = getStyleProperty(item, styleContextStack, 'italics', false);
		let color = getStyleProperty(item, styleContextStack, 'color', 'black');
		let decoration = getStyleProperty(item, styleContextStack, 'decoration', null);
		let decorationColor = getStyleProperty(item, styleContextStack, 'decorationColor', null);
		let decorationStyle = getStyleProperty(item, styleContextStack, 'decorationStyle', null);
		let background = getStyleProperty(item, styleContextStack, 'background', null);
		let lineHeight = getStyleProperty(item, styleContextStack, 'lineHeight', 1);
		let characterSpacing = getStyleProperty(item, styleContextStack, 'characterSpacing', 0);
		let link = getStyleProperty(item, styleContextStack, 'link', null);
		let linkToPage = getStyleProperty(item, styleContextStack, 'linkToPage', null);
		let noWrap = getStyleProperty(item, styleContextStack, 'noWrap', null);
		let preserveLeadingSpaces = getStyleProperty(item, styleContextStack, 'preserveLeadingSpaces', false);

		let font = fontProvider.provideFont(fontName, bold, italics);

		item.width = widthOfString(item.text, font, fontSize, characterSpacing, fontFeatures);
		item.height = font.lineHeight(fontSize) * lineHeight;

		let leadingSpaces = item.text.match(LEADING);

		if (!item.leadingCut) {
			item.leadingCut = 0;
		}

		if (leadingSpaces && !preserveLeadingSpaces) {
			item.leadingCut += widthOfString(leadingSpaces[0], font, fontSize, characterSpacing, fontFeatures);
		}

		let trailingSpaces = item.text.match(TRAILING);
		if (trailingSpaces) {
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

export default TextTools;
