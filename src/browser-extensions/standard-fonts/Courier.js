var fs = require('fs');

var fontContainer = {
	vfs: {
		'data/Courier.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/@foliojs-fork/pdfkit/js/data/Courier.afm', 'utf8'), encoding: 'utf8' },
		'data/Courier-Bold.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/@foliojs-fork/pdfkit/js/data/Courier-Bold.afm', 'utf8'), encoding: 'utf8' },
		'data/Courier-Oblique.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/@foliojs-fork/pdfkit/js/data/Courier-Oblique.afm', 'utf8'), encoding: 'utf8' },
		'data/Courier-BoldOblique.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/@foliojs-fork/pdfkit/js/data/Courier-BoldOblique.afm', 'utf8'), encoding: 'utf8' }
	},
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
