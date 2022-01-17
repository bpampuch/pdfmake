var fs = require('fs');

var fontContainer = {
	vfs: {
		'data/Helvetica.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/@foliojs-fork/pdfkit/js/data/Helvetica.afm', 'utf8'), encoding: 'utf8' },
		'data/Helvetica-Bold.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/@foliojs-fork/pdfkit/js/data/Helvetica-Bold.afm', 'utf8'), encoding: 'utf8' },
		'data/Helvetica-Oblique.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/@foliojs-fork/pdfkit/js/data/Helvetica-Oblique.afm', 'utf8'), encoding: 'utf8' },
		'data/Helvetica-BoldOblique.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/@foliojs-fork/pdfkit/js/data/Helvetica-BoldOblique.afm', 'utf8'), encoding: 'utf8' }
	},
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
