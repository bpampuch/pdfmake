var fs = require('fs');

var fontContainer = {
	vfs: {
		'data/Times-Roman.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/pdfkit/js/data/Times-Roman.afm', 'utf8'), encoding: 'utf8' },
		'data/Times-Bold.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/pdfkit/js/data/Times-Bold.afm', 'utf8'), encoding: 'utf8' },
		'data/Times-Italic.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/pdfkit/js/data/Times-Italic.afm', 'utf8'), encoding: 'utf8' },
		'data/Times-BoldItalic.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/pdfkit/js/data/Times-BoldItalic.afm', 'utf8'), encoding: 'utf8' }
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

if (typeof this.pdfMake !== 'undefined' && typeof this.pdfMake.addFontContainer !== 'undefined') {
	this.pdfMake.addFontContainer(fontContainer);
}

if (typeof module !== 'undefined') {
	module.exports = fontContainer;
}
