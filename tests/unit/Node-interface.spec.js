'use strict';

var pdfmake = require('../../js/index');

pdfmake.addFonts({
	Roboto: {
		normal: 'tests/fonts/Roboto-Regular.ttf',
		bold: 'tests/fonts/Roboto-Medium.ttf',
		italics: 'tests/fonts/Roboto-Italic.ttf',
		bolditalics: 'tests/fonts/Roboto-MediumItalic.ttf'
	}
});

describe('Node interface', function () {
	describe('getBuffer', function () {
		it('should return buffer', function () {

			var docDefinition = {
				content: [
					'First paragraph',
					'Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines'
				]
			};

			var pdf = pdfmake.createPdf(docDefinition);
			pdf.getBuffer().then(() => {
				//
			}, err => {
				throw err;
			});

		});

	});
});
