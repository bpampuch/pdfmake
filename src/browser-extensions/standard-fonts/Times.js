var fs = require('fs');

var fontContainer = {
	vfs: {
		'data/Times-Roman.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/@foliojs-fork/pdfkit/js/data/Times-Roman.afm', 'utf8'), encoding: 'utf8' },
		'data/Times-Bold.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/@foliojs-fork/pdfkit/js/data/Times-Bold.afm', 'utf8'), encoding: 'utf8' },
		'data/Times-Italic.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/@foliojs-fork/pdfkit/js/data/Times-Italic.afm', 'utf8'), encoding: 'utf8' },
		'data/Times-BoldItalic.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/@foliojs-fork/pdfkit/js/data/Times-BoldItalic.afm', 'utf8'), encoding: 'utf8' }
	},
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
