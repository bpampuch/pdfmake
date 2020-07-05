var fs = require('fs');

var fontContainer = {
	vfs: {
		'data/Symbol.afm': { data: fs.readFileSync(__dirname + '/../../../node_modules/pdfkit/js/data/Symbol.afm', 'utf8'), encoding: 'utf8' }
	},
	fonts: {
		Symbol: {
			normal: 'Symbol'
		}
	}
};

if (typeof this.pdfMake !== 'undefined' && typeof this.pdfMake.addFontContainer !== 'undefined') {
	this.pdfMake.addFontContainer(fontContainer);
}

if (typeof module !== 'undefined') {
	module.exports = fontContainer;
}
