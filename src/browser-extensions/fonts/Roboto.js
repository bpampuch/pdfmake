var fs = require('fs');

var fontContainer = {
	vfs: {
		'Roboto-Regular.ttf': { data: fs.readFileSync(__dirname + '/../../../fonts/Roboto/Roboto-Regular.ttf', 'base64'), encoding: 'base64' },
		'Roboto-Medium.ttf': { data: fs.readFileSync(__dirname + '/../../../fonts/Roboto/Roboto-Medium.ttf', 'base64'), encoding: 'base64' },
		'Roboto-Italic.ttf': { data: fs.readFileSync(__dirname + '/../../../fonts/Roboto/Roboto-Italic.ttf', 'base64'), encoding: 'base64' },
		'Roboto-MediumItalic.ttf': { data: fs.readFileSync(__dirname + '/../../../fonts/Roboto/Roboto-MediumItalic.ttf', 'base64'), encoding: 'base64' }
	},
	fonts: {
		Roboto: {
			normal: 'Roboto-Regular.ttf',
			bold: 'Roboto-Medium.ttf',
			italics: 'Roboto-Italic.ttf',
			bolditalics: 'Roboto-MediumItalic.ttf'
		}
	}
};

if (typeof this.pdfMake !== 'undefined' && typeof this.pdfMake.addFontContainer !== 'undefined') {
	this.pdfMake.addFontContainer(fontContainer);
}

if (typeof module !== 'undefined') {
	module.exports = fontContainer;
}
