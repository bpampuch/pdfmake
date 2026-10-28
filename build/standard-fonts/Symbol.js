var fontContainer = {"standardFonts":[{"name":"Symbol","bbox":[-180,-293,1090,1010],"ascender":0,"descender":0,"xHeight":0,"capHeight":0,"glyphNames":"space exclam numbersign percent ampersand parenleft parenright plus comma period slash zero one two three four five six seven eight nine colon semicolon less equal greater question bracketleft bracketright underscore braceleft bar braceright Euro florin ellipsis bullet logicalnot degree plusminus mu multiply divide","glyphWidths":[250,333,500,833,778,333,333,549,250,250,278,500,500,500,500,500,500,500,500,500,500,278,278,549,549,549,444,333,333,500,480,200,480,750,500,1000,460,713,400,549,576,549,549],"kernPairs":[]}],"fonts":{"Symbol":{"normal":"Symbol"}}};

var _global = typeof window === 'object' ? window : typeof global === 'object' ? global : typeof self === 'object' ? self : this;
if (typeof _global.pdfMake !== 'undefined' && typeof _global.pdfMake.addFontContainer !== 'undefined') {
	_global.pdfMake.addFontContainer(fontContainer);
}
if (typeof module !== 'undefined') {
	module.exports = fontContainer;
}
