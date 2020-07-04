var fs = require('fs');

var fontContainer = {
	vfs: {
		'data/Symbol.afm': fs.readFileSync(__dirname + '/../../../node_modules/pdfkit/js/data/Symbol.afm', 'utf8')
	},
	fonts: {
		Symbol: {
			normal: 'Symbol'
		}
	}
};

if (typeof this.pdfMake !== 'undefined' && typeof this.pdfMake.addFonts !== 'undefined') {
	this.pdfMake.registerFontContainer(fontContainer);
}

if (typeof module !== 'undefined') {
	module.exports = fontContainer;
}
