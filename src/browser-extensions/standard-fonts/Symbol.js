var fs = require('fs');

var fontContainer = {
	vfs: {
		'data/Symbol.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/@foliojs-fork/pdfkit/js/data/Symbol.afm', 'utf8'), encoding: 'utf8' }
	},
	fonts: {
		Symbol: {
			normal: 'Symbol'
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
