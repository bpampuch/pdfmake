var fontContainer = {"standardFonts":[{"name":"ZapfDingbats","bbox":[-1,-143,981,820],"ascender":0,"descender":0,"xHeight":0,"capHeight":0,"glyphNames":"space","glyphWidths":[278],"kernPairs":[]}],"fonts":{"ZapfDingbats":{"normal":"ZapfDingbats"}}};

var _global = typeof window === 'object' ? window : typeof global === 'object' ? global : typeof self === 'object' ? self : this;
if (typeof _global.pdfMake !== 'undefined' && typeof _global.pdfMake.addFontContainer !== 'undefined') {
	_global.pdfMake.addFontContainer(fontContainer);
}
if (typeof module !== 'undefined') {
	module.exports = fontContainer;
}
