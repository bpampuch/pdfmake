var fontContainer = {
	standardFonts: [require('pdfkit/standard-fonts/ZapfDingbats')],
	fonts: {
		ZapfDingbats: {
			normal: 'ZapfDingbats'
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
