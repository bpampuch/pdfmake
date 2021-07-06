var fs = require('fs');

var fontContainer = {
	vfs: {
		'data/ZapfDingbats.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/@foliojs-fork/pdfkit/js/data/ZapfDingbats.afm', 'utf8'), encoding: 'utf8' }
	},
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
