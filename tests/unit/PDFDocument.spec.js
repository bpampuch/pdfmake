var assert = require('assert');

var PDFDocument = require('../../js/PDFDocument').default;

describe('PDFDocument', function () {
	var pdfDocument, fontDefinitions;

	beforeEach(function () {
		fontDefinitions = {};
		pdfDocument = new PDFDocument(fontDefinitions);
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

	});
});
