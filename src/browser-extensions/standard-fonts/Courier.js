var fs = require('fs');

var fontContainer = {
	vfs: {
		'data/Courier.afm': fs.readFileSync(__dirname + '/../../../node_modules/pdfkit/js/data/Courier.afm', 'utf8'),
		'data/Courier-Bold.afm': fs.readFileSync(__dirname + '/../../../node_modules/pdfkit/js/data/Courier-Bold.afm', 'utf8'),
		'data/Courier-Oblique.afm': fs.readFileSync(__dirname + '/../../../node_modules/pdfkit/js/data/Courier-Oblique.afm', 'utf8'),
		'data/Courier-BoldOblique.afm': fs.readFileSync(__dirname + '/../../../node_modules/pdfkit/js/data/Courier-BoldOblique.afm', 'utf8')
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

if (typeof this.pdfMake !== 'undefined' && typeof this.pdfMake.addFonts !== 'undefined') {
	this.pdfMake.registerFontContainer(fontContainer);
}

if (typeof module !== 'undefined') {
	module.exports = fontContainer;
}
