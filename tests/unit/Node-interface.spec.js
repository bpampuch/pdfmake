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

	describe('download', function () {
		it('should download PDF with content', function (done) {
			var docDefinition = {
				content: [
					'First paragraph',
					'Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines'
				]
			};

			var pdf = pdfmake.createPdf(docDefinition);
			pdf.download('test.pdf').then(() => {
				pdf.getBuffer().then(buffer => {
					if (buffer.byteLength === 0) {
						throw new Error('Empty PDF content');
					} else {
						done();
					}
				}).catch(err => {
					throw err;
				});
			}).catch(err => {
				throw err;
			});
		});
	});
});
