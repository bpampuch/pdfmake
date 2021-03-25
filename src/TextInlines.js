import TextBreaker from './TextBreaker';
import StyleContextStack from './StyleContextStack';

const LEADING = /^(\s)+/g;
const TRAILING = /(\s)+$/g;

/**
 * @param {Array} array
 * @returns {Array}
 */
const flattenTextArray = array => {
	function flatten(array) {
		return array.reduce((prev, cur) => {
			let current = Array.isArray(cur.text) ? flatten(cur.text) : cur;
			let more = [].concat(current).some(Array.isArray);
			return prev.concat(more ? flatten(current) : current);
		}, []);
	}

	if (!Array.isArray(array)) {
		array = [array];
	}

	// TODO: Styling in nested text (issue: https://github.com/bpampuch/pdfmake/issues/1174)

	array = flatten(array);

	return array;
};


/**
 * Text measurement utility
 */
class TextInlines {

	/**
	 * @param {object} pdfDocument object is instance of PDFDocument
	 */
	constructor(pdfDocument) {
		this.pdfDocument = pdfDocument;
	}

	/**
	 * Converts an array of strings (or inline-definition-objects) into a collection
	 * of inlines and calculated minWidth/maxWidth and their min/max widths
	 *
	 * @param {Array} textArray an array of inline-definition-objects (or strings)
	 * @param {StyleContextStack} styleContextStack current style stack
	 * @returns {object} collection of inlines, minWidth, maxWidth
	 */
	buildInlines(textArray, styleContextStack) {
		const getTrimmedWidth = item => {
			return Math.max(0, item.width - item.leadingCut - item.trailingCut);
		};

		let minWidth = 0;
		let maxWidth = 0;
		let currentLineWidth;

		let flattenedTextArray = flattenTextArray(textArray);

		const textBreaker = new TextBreaker();
		let breakedText = textBreaker.getBreaks(flattenedTextArray, styleContextStack);

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

		if (StyleContextStack.getStyleProperty({}, styleContextStack, 'noWrap', false)) {
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
			let leadingIndent = StyleContextStack.getStyleProperty(array[0], styleContextStack, 'leadingIndent', 0);
			if (leadingIndent) {
				array[0].leadingCut = -leadingIndent;
				array[0].leadingIndent = leadingIndent;
			}
		}

		array.forEach(item => {
			let font = StyleContextStack.getStyleProperty(item, styleContextStack, 'font', 'Roboto');
			let bold = StyleContextStack.getStyleProperty(item, styleContextStack, 'bold', false);
			let italics = StyleContextStack.getStyleProperty(item, styleContextStack, 'italics', false);

			item.font = this.pdfDocument.provideFont(font, bold, italics);

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
			item.linkToDestination = StyleContextStack.getStyleProperty(item, styleContextStack, 'linkToDestination', null);
			item.noWrap = StyleContextStack.getStyleProperty(item, styleContextStack, 'noWrap', null);
			item.opacity = StyleContextStack.getStyleProperty(item, styleContextStack, 'opacity', 1);
			item.sup = StyleContextStack.getStyleProperty(item, styleContextStack, 'sup', false);
			item.sub = StyleContextStack.getStyleProperty(item, styleContextStack, 'sub', false);

			if (item.sup || item.sub) {
				// font size reduction taken from here: https://en.wikipedia.org/wiki/Subscript_and_superscript#Desktop_publishing
				item.fontSize *= 0.58;
			}

			let lineHeight = StyleContextStack.getStyleProperty(item, styleContextStack, 'lineHeight', 1);

			item.width = this.widthOfText(item.text, item);
			item.height = item.font.lineHeight(item.fontSize) * lineHeight;

			if (!item.leadingCut) {
				item.leadingCut = 0;
			}

			let preserveLeadingSpaces = StyleContextStack.getStyleProperty(item, styleContextStack, 'preserveLeadingSpaces', false);
			if (!preserveLeadingSpaces) {
				let leadingSpaces = item.text.match(LEADING);
				if (leadingSpaces) {
					item.leadingCut += this.widthOfText(leadingSpaces[0], item);
				}
			}

			item.trailingCut = 0;

			let preserveTrailingSpaces = StyleContextStack.getStyleProperty(item, styleContextStack, 'preserveTrailingSpaces', false);
			if (!preserveTrailingSpaces) {
				let trailingSpaces = item.text.match(TRAILING);
				if (trailingSpaces) {
					item.trailingCut = this.widthOfText(trailingSpaces[0], item);
				}
			}
		}, this);

		return array;
	}

	/**
	 * Width of text
	 *
	 * @param {string} text
	 * @param {object} inline
	 * @returns {number}
	 */
	widthOfText(text, inline) {
		return inline.font.widthOfString(text, inline.fontSize, inline.fontFeatures) + ((inline.characterSpacing || 0) * (text.length - 1));
	}

	/**
	 * Returns size of the specified string (without breaking it) using the current style
	 *
	 * @param {string} text text to be measured
	 * @param {object} styleContextStack current style stack
	 * @returns {object} size of the specified string
	 */
	sizeOfText(text, styleContextStack) {
		//TODO: refactor - extract from measure
		let fontName = StyleContextStack.getStyleProperty({}, styleContextStack, 'font', 'Roboto');
		let fontSize = StyleContextStack.getStyleProperty({}, styleContextStack, 'fontSize', 12);
		let fontFeatures = StyleContextStack.getStyleProperty({}, styleContextStack, 'fontFeatures', null);
		let bold = StyleContextStack.getStyleProperty({}, styleContextStack, 'bold', false);
		let italics = StyleContextStack.getStyleProperty({}, styleContextStack, 'italics', false);
		let lineHeight = StyleContextStack.getStyleProperty({}, styleContextStack, 'lineHeight', 1);
		let characterSpacing = StyleContextStack.getStyleProperty({}, styleContextStack, 'characterSpacing', 0);

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

	/**
	 * Returns size of the specified rotated string (without breaking it) using the current style
	 *
	 * @param {string} text text to be measured
	 * @param {number} angle
	 * @param {object} styleContextStack current style stack
	 * @returns {object} size of the specified string
	 */
	sizeOfRotatedText(text, angle, styleContextStack) {
		let angleRad = angle * Math.PI / -180;
		let size = this.sizeOfText(text, styleContextStack);
		return {
			width: Math.abs(size.height * Math.sin(angleRad)) + Math.abs(size.width * Math.cos(angleRad)),
			height: Math.abs(size.width * Math.sin(angleRad)) + Math.abs(size.height * Math.cos(angleRad))
		};
	}
}

export default TextInlines;
