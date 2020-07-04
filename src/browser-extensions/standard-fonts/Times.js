var fs = require('fs');

var fontContainer = {
	vfs: {
		'data/Times-Roman.afm': fs.readFileSync(__dirname + '/../../../node_modules/pdfkit/js/data/Times-Roman.afm', 'utf8'),
		'data/Times-Bold.afm': fs.readFileSync(__dirname + '/../../../node_modules/pdfkit/js/data/Times-Bold.afm', 'utf8'),
		'data/Times-Italic.afm': fs.readFileSync(__dirname + '/../../../node_modules/pdfkit/js/data/Times-Italic.afm', 'utf8'),
		'data/Times-BoldItalic.afm': fs.readFileSync(__dirname + '/../../../node_modules/pdfkit/js/data/Times-BoldItalic.afm', 'utf8'),
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

if (typeof this.pdfMake !== 'undefined' && typeof this.pdfMake.addFonts !== 'undefined') {
	this.pdfMake.registerFontContainer(fontContainer);
}

if (typeof module !== 'undefined') {
	module.exports = fontContainer;
}
