var fs = require('fs');

var fontContainer = {
	vfs: {
		'data/ZapfDingbats.afm': fs.readFileSync(__dirname + '/../../../node_modules/pdfkit/js/data/ZapfDingbats.afm', 'utf8')
	},
	fonts: {
		ZapfDingbats: {
			normal: 'ZapfDingbats'
		}
	}
};

if (typeof this.pdfMake !== 'undefined' && typeof this.pdfMake.addFonts !== 'undefined') {
	this.pdfMake.registerFontContainer(fontContainer);
}

if (typeof module !== 'undefined') {
	module.exports = fontContainer;
}
