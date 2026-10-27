var fontContainer = {
	standardFonts: [
		require('pdfkit/standard-fonts/TimesRoman'),
		require('pdfkit/standard-fonts/TimesBold'),
		require('pdfkit/standard-fonts/TimesItalic'),
		require('pdfkit/standard-fonts/TimesBoldItalic')
	],
	fonts: {
		Times: {
			normal: 'Times-Roman',
			bold: 'Times-Bold',
			italics: 'Times-Italic',
			bolditalics: 'Times-BoldItalic'
		}
	}
};

var _global = typeof window === 'object' ? window : typeof global === 'object' ? global : typeof self === 'object' ? self : this;
if (typeof _global.pdfMake !== 'undefined' && typeof _global.pdfMake.addFontContainer !== 'undefined') {
	_global.pdfMake.addFontContainer(fontContainer);
}

if (typeof module !== 'undefined') {
	module.exports = fontContainer;
}
