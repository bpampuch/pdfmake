import { isArray } from './helpers/variableType';
import TextBreaker from './TextBreaker';
import StyleContextStack from './StyleContextStack';
import defaults from './defaults';

const LEADING = /^(\s)+/g;
const TRAILING = /(\s)+$/g;

/**
 * @param {array} textArray
 * @return {array}
 */
const flattenTextArray = array => {
	function flatten(array) {
		return array.reduce((prev, cur) => {
			var current = isArray(cur.text) ? flatten(cur.text) : cur;
			var more = [].concat(current).some(Array.isArray);
			return prev.concat(more ? flatten(current) : current);
		}, []);
	}

	if (!isArray(array)) {
		array = [array];
	}

	// TODO: Styling in nested text (issue: https://github.com/bpampuch/pdfmake/issues/1174)

	array = flatten(array);

	return array;
};

class TextInlines {

	/**
	 * @param {PDFDocument} pdfDocument
	 */
	constructor(pdfDocument) {
		this.pdfDocument = pdfDocument;
	}

	/**
	 * Converts an array of strings (or inline-definition-objects) into a collection of inlines
	 * and calculated minWidth/maxWidth and their min/max widths.
	 *
	 * @param {array} textArray  an array of inline-definition-objects (or strings)
	 * @param {StyleContextStack} styleContextStack  current style stack
	 * @return {object}  collection of inlines, minWidth, maxWidth
	 */
	buildInlines(textArray, styleContextStack) {
		let getTrimmedWidth = item => {
			return Math.max(0, item.width - item.leadingCut - item.trailingCut);
		};

		let minWidth = 0;
		let maxWidth = 0;
		let currentLineWidth;

		let flattenText = flattenTextArray(textArray);

		let textBreaker = new TextBreaker();
		let breakedText = textBreaker.getBreaks(flattenText);

		let measuredText = this.measure(breakedText, styleContextStack);

		measuredText.forEach(inline => {
			minWidth = Math.max(minWidth, getTrimmedWidth(inline));

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

		if (StyleContextStack.getStyleProperty({}, styleContextStack, 'noWrap', defaults.noWrap)) {
			minWidth = maxWidth;
		}

		return {
			items: measuredText,
			minWidth: minWidth,
			maxWidth: maxWidth
		};
	}

	measure(array, styleContextStack) {
		if (array.length) {
			let leadingIndent = StyleContextStack.getStyleProperty(array[0], styleContextStack, 'leadingIndent', defaults.leadingIndent);
			if (leadingIndent) {
				array[0].leadingCut = -leadingIndent;
				array[0].leadingIndent = leadingIndent;
			}
		}

		array.forEach(function (item) {
			let font = StyleContextStack.getStyleProperty(item, styleContextStack, 'font', defaults.font);
			let bold = StyleContextStack.getStyleProperty(item, styleContextStack, 'bold', defaults.bold);
			let italics = StyleContextStack.getStyleProperty(item, styleContextStack, 'italics', defaults.italics);

			item.font = this.pdfDocument.provideFont(font, bold, italics);

			item.alignment = StyleContextStack.getStyleProperty(item, styleContextStack, 'alignment', defaults.alignment);
			item.fontSize = StyleContextStack.getStyleProperty(item, styleContextStack, 'fontSize', defaults.fontSize);
			item.fontFeatures = StyleContextStack.getStyleProperty(item, styleContextStack, 'fontFeatures', defaults.fontFeatures);
			item.characterSpacing = StyleContextStack.getStyleProperty(item, styleContextStack, 'characterSpacing', defaults.characterSpacing);
			item.color = StyleContextStack.getStyleProperty(item, styleContextStack, 'color', defaults.color);
			item.decoration = StyleContextStack.getStyleProperty(item, styleContextStack, 'decoration', defaults.decoration);
			item.decorationColor = StyleContextStack.getStyleProperty(item, styleContextStack, 'decorationColor', defaults.decorationColor);
			item.decorationStyle = StyleContextStack.getStyleProperty(item, styleContextStack, 'decorationStyle', defaults.decorationStyle);
			item.background = StyleContextStack.getStyleProperty(item, styleContextStack, 'background', defaults.background);
			item.link = StyleContextStack.getStyleProperty(item, styleContextStack, 'link', defaults.link);
			item.linkToPage = StyleContextStack.getStyleProperty(item, styleContextStack, 'linkToPage', defaults.linkToPage);
			item.noWrap = StyleContextStack.getStyleProperty(item, styleContextStack, 'noWrap', defaults.noWrap);

			let lineHeight = StyleContextStack.getStyleProperty(item, styleContextStack, 'lineHeight', defaults.lineHeight);

			item.width = this.widthOfText(item.text, item);
			item.height = item.font.lineHeight(item.fontSize) * lineHeight;

			if (!item.leadingCut) {
				item.leadingCut = 0;
			}

			let preserveLeadingSpaces = StyleContextStack.getStyleProperty(item, styleContextStack, 'preserveLeadingSpaces', defaults.preserveLeadingSpaces);
			if (!preserveLeadingSpaces) {
				let leadingSpaces = item.text.match(LEADING);
				if (leadingSpaces) {
					item.leadingCut += this.widthOfText(leadingSpaces[0], item);
				}
			}

			let trailingSpaces = item.text.match(TRAILING);
			if (trailingSpaces) {
				item.trailingCut = this.widthOfText(trailingSpaces[0], item);
			} else {
				item.trailingCut = 0;
			}
		}, this);

		return array;
	}

	/**
	 * Width of text
	 *
	 * @param {string} text
	 * @param {object} inline
	 * @return {integer}
	 */
	widthOfText(text, inline) {
		return inline.font.widthOfString(text, inline.fontSize, inline.fontFeatures) + ((inline.characterSpacing || 0) * (text.length - 1));
	}

	/**
	 * Returns size of the specified string (without breaking it) using the current style
	 *
	 * @param {string} text  text to be measured
	 * @param {StyleContextStack} styleContextStack  current style stack
	 * @return {object}  size of the specified string
	 */
	sizeOfText(text, styleContextStack) {
		//TODO: refactor - extract from measure
		let fontName = StyleContextStack.getStyleProperty({}, styleContextStack, 'font', defaults.font);
		let fontSize = StyleContextStack.getStyleProperty({}, styleContextStack, 'fontSize', defaults.fontSize);
		let fontFeatures = StyleContextStack.getStyleProperty({}, styleContextStack, 'fontFeatures', defaults.fontFeatures);
		let bold = StyleContextStack.getStyleProperty({}, styleContextStack, 'bold', defaults.bold);
		let italics = StyleContextStack.getStyleProperty({}, styleContextStack, 'italics', defaults.italics);
		let lineHeight = StyleContextStack.getStyleProperty({}, styleContextStack, 'lineHeight', defaults.lineHeight);
		let characterSpacing = StyleContextStack.getStyleProperty({}, styleContextStack, 'characterSpacing', defaults.characterSpacing);

		let font = this.pdfDocument.provideFont(fontName, bold, italics);

		return {
			width: this.widthOfText(text, { font: font, fontSize: fontSize, characterSpacing: characterSpacing, fontFeatures: fontFeatures }),
			height: font.lineHeight(fontSize) * lineHeight,
			fontSize: fontSize,
			lineHeight: lineHeight,
			ascender: font.ascender / 1000 * fontSize,
			descender: font.descender / 1000 * fontSize
		};
	}

}

export default TextInlines;
