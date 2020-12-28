var fs = require('fs');

var fontContainer = {
	vfs: {
		'data/ZapfDingbats.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/pdfkit/js/data/ZapfDingbats.afm', 'utf8'), encoding: 'utf8' }
	},
	fonts: {
		ZapfDingbats: {
			normal: 'ZapfDingbats'
		}
	}
};

if (typeof this.pdfMake !== 'undefined' && typeof this.pdfMake.addFontContainer !== 'undefined') {
	this.pdfMake.addFontContainer(fontContainer);
}

if (typeof module !== 'undefined') {
	module.exports = fontContainer;
}
