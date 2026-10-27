var fontContainer = {
	standardFonts: [
		require('pdfkit/standard-fonts/Helvetica'),
		require('pdfkit/standard-fonts/HelveticaBold'),
		require('pdfkit/standard-fonts/HelveticaOblique'),
		require('pdfkit/standard-fonts/HelveticaBoldOblique')
	],
	fonts: {
		Helvetica: {
			normal: 'Helvetica',
			bold: 'Helvetica-Bold',
			italics: 'Helvetica-Oblique',
			bolditalics: 'Helvetica-BoldOblique'
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
