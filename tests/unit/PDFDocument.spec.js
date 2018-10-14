var assert = require('assert');

var PDFDocument = require('../../js/PDFDocument').default;

describe('PDFDocument', function () {
	var pdfDocument;

	beforeEach(function () {
		var fonts = {
			Roboto: {
				normal: 'fonts/Roboto-Regular.ttf',
				bold: 'fonts/Roboto-Medium.ttf',
				italics: 'fonts/Roboto-Italic.ttf',
				bolditalics: 'fonts/Roboto-MediumItalic.ttf'
			}
		};
		pdfDocument = new PDFDocument(fonts);
	});

	describe('provideFont', function () {

		it('throws error when given font not present', function () {
			assert.throws(function () {
				pdfDocument.provideFont('Arial', true, false);
			}, function (error) {
				assert.equal(error.message, 'Font \'Arial\' in style \'bold\' is not defined in the font section of the document definition.');
				return true;
			});
		});

		it('should provide normal Roboto font', function () {
			var result = pdfDocument.provideFont('Roboto', false, false);
			assert.equal(result.font.postscriptName, 'Roboto-Regular');
		});

		it('should provide bold Roboto font', function () {
			var result = pdfDocument.provideFont('Roboto', true, false);
			assert.equal(result.font.postscriptName, 'Roboto-Medium');
		});

		it('should provide italics Roboto font', function () {
			var result = pdfDocument.provideFont('Roboto', false, true);
			assert.equal(result.font.postscriptName, 'Roboto-Italic');
		});

		it('should provide bold and italics Roboto font', function () {
			var result = pdfDocument.provideFont('Roboto', true, true);
			assert.equal(result.font.postscriptName, 'Roboto-MediumItalic');
		});

	});

	describe('provideImage', function () {

		// TODO

	});

});
