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

}

export default TextTools;
