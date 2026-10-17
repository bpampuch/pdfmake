var fontContainer = {
	standardFonts: [
		require('pdfkit/standard-fonts/Courier'),
		require('pdfkit/standard-fonts/CourierBold'),
		require('pdfkit/standard-fonts/CourierOblique'),
		require('pdfkit/standard-fonts/CourierBoldOblique')
	],
	fonts: {
		Courier: {
			normal: 'Courier',
			bold: 'Courier-Bold',
			italics: 'Courier-Oblique',
			bolditalics: 'Courier-BoldOblique'
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
