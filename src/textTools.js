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
