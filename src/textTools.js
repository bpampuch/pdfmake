import { isArray } from './helpers/variableType';
import TextBreaker from './TextBreaker';
import StyleContextStack from './styleContextStack';

var LEADING = /^(\s)+/g;
var TRAILING = /(\s)+$/g;

/**
 * Text measurement utility
 */
class TextTools {

	/**
	 * @param {PDFDocument} pdfDocument
	 */
	constructor(pdfDocument) {
		this.pdfDocument = pdfDocument;
	}

	/**
	 * Converts an array of strings (or inline-definition-objects) into a collection
	 * of inlines and calculated minWidth/maxWidth.
	 * and their min/max widths
	 * @param  {Object} textArray - an array of inline-definition-objects (or strings)
	 * @param  {Object} styleContextStack current style stack
	 * @return {Object} collection of inlines, minWidth, maxWidth
	 */
	buildInlines(textArray, styleContextStack) {
		var measured = measure(this.pdfDocument, textArray, styleContextStack);

		var minWidth = 0;
		var maxWidth = 0;
		var currentLineWidth;

		measured.forEach(inline => {
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

		if (StyleContextStack.getStyleProperty({}, styleContextStack, 'noWrap', false)) {
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
	 * @param  {String} text			  text to be measured
	 * @param  {Object} styleContextStack current style stack
	 * @return {Object}				   size of the specified string
	 */
	sizeOfString(text, styleContextStack) {
		//text = text ? text.toString().replace(/\t/g, '    ') : '';

		//TODO: refactor - extract from measure
		var fontName = StyleContextStack.getStyleProperty({}, styleContextStack, 'font', 'Roboto');
		var fontSize = StyleContextStack.getStyleProperty({}, styleContextStack, 'fontSize', 12);
		var fontFeatures = StyleContextStack.getStyleProperty({}, styleContextStack, 'fontFeatures', null);
		var bold = StyleContextStack.getStyleProperty({}, styleContextStack, 'bold', false);
		var italics = StyleContextStack.getStyleProperty({}, styleContextStack, 'italics', false);
		var lineHeight = StyleContextStack.getStyleProperty({}, styleContextStack, 'lineHeight', 1);
		var characterSpacing = StyleContextStack.getStyleProperty({}, styleContextStack, 'characterSpacing', 0);

		var font = this.pdfDocument.provideFont(fontName, bold, italics);

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

function normalizeTextArray(array, styleContextStack) {
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

	let textBreaker = new TextBreaker();
	return textBreaker.getBreaks(array, styleContextStack);
}

function measure(pdfDocument, textArray, styleContextStack) {
	let normalized = normalizeTextArray(textArray, styleContextStack);

	if (normalized.length) {
		let leadingIndent = StyleContextStack.getStyleProperty(normalized[0], styleContextStack, 'leadingIndent', 0);
		if (leadingIndent) {
			normalized[0].leadingCut = -leadingIndent;
			normalized[0].leadingIndent = leadingIndent;
		}
	}

	normalized.forEach(item => {
		let font = StyleContextStack.getStyleProperty(item, styleContextStack, 'font', 'Roboto');
		let bold = StyleContextStack.getStyleProperty(item, styleContextStack, 'bold', false);
		let italics = StyleContextStack.getStyleProperty(item, styleContextStack, 'italics', false);

		item.font = pdfDocument.provideFont(font, bold, italics);

		item.alignment = StyleContextStack.getStyleProperty(item, styleContextStack, 'alignment', 'left');
		item.fontSize = StyleContextStack.getStyleProperty(item, styleContextStack, 'fontSize', 12);
		item.fontFeatures = StyleContextStack.getStyleProperty(item, styleContextStack, 'fontFeatures', null);
		item.characterSpacing = StyleContextStack.getStyleProperty(item, styleContextStack, 'characterSpacing', 0);
		item.color = StyleContextStack.getStyleProperty(item, styleContextStack, 'color', 'black');
		item.decoration = StyleContextStack.getStyleProperty(item, styleContextStack, 'decoration', null);
		item.decorationColor = StyleContextStack.getStyleProperty(item, styleContextStack, 'decorationColor', null);
		item.decorationStyle = StyleContextStack.getStyleProperty(item, styleContextStack, 'decorationStyle', null);
		item.background = StyleContextStack.getStyleProperty(item, styleContextStack, 'background', null);
		item.link = StyleContextStack.getStyleProperty(item, styleContextStack, 'link', null);
		item.linkToPage = StyleContextStack.getStyleProperty(item, styleContextStack, 'linkToPage', null);
		item.noWrap = StyleContextStack.getStyleProperty(item, styleContextStack, 'noWrap', null);
		item.opacity = StyleContextStack.getStyleProperty(item, styleContextStack, 'opacity', 1);

		let lineHeight = StyleContextStack.getStyleProperty(item, styleContextStack, 'lineHeight', 1);

		item.width = widthOfString(item.text, item.font, item.fontSize, item.characterSpacing, item.fontFeatures);
		item.height = item.font.lineHeight(item.fontSize) * lineHeight;

		if (!item.leadingCut) {
			item.leadingCut = 0;
		}

		let preserveLeadingSpaces = StyleContextStack.getStyleProperty(item, styleContextStack, 'preserveLeadingSpaces', false);
		if (!preserveLeadingSpaces) {
			let leadingSpaces = item.text.match(LEADING);
			if (leadingSpaces) {
				item.leadingCut += widthOfString(leadingSpaces[0], item.font, item.fontSize, item.characterSpacing, item.fontFeatures);
			}
		}

		item.trailingCut = 0;

		let preserveTrailingSpaces = StyleContextStack.getStyleProperty(item, styleContextStack, 'preserveTrailingSpaces', false);
		if (!preserveTrailingSpaces) {
			let trailingSpaces = item.text.match(TRAILING);
			if (trailingSpaces) {
				item.trailingCut = widthOfString(trailingSpaces[0], item.font, item.fontSize, item.characterSpacing, item.fontFeatures);
			}
		}
	});

	return normalized;
}

function widthOfString(text, font, fontSize, characterSpacing, fontFeatures) {
	return font.widthOfString(text, fontSize, fontFeatures) + ((characterSpacing || 0) * (text.length - 1));
}

export default TextTools;
