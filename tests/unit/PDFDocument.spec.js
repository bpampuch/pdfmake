'use strict';

var assert = require('assert');

var PDFDocument = require('../../js/PDFDocument').default;

describe('PDFDocument', function () {
	var pdfDocument;

	beforeEach(function () {
		var fontDefinitions = {
			Roboto: {
				normal: 'tests/fonts/Roboto-Regular.ttf',
				bold: 'tests/fonts/Roboto-Medium.ttf',
				italics: 'tests/fonts/Roboto-Italic.ttf',
				bolditalics: 'tests/fonts/Roboto-MediumItalic.ttf'
			}
		};

		var images = {
			mystringimage: 'tests/fonts/sampleImage.jpg',
			myobjectimage: {
				url: 'tests/fonts/sampleImage.jpg',
				headers: {
					auth: '123',
				}
			}
		};
		pdfDocument = new PDFDocument(fontDefinitions, images);
	});

	describe('provideFont', function () {

		it('throws error when given font not present', function () {
			assert.throws(function () {
				pdfDocument.provideFont('Arial', true, false);
			}, function (error) {
				assert.equal(error.message, `Font 'Arial' in style 'bold' is not defined in the font section of the document definition.`);
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

		it('should provide a string path image', function () {
			var result = pdfDocument.provideImage('mystringimage');
			assert.equal(result.constructor.name, 'JPEG');
		});

		it('should provide an object path image', function () {
			var result = pdfDocument.provideImage('myobjectimage');
			assert.equal(result.constructor.name, 'JPEG');
		});

		it('should throw an error if no image is found', function () {
			assert.throws(function () {
				pdfDocument.provideImage('mymissingimage');
			}, function (error) {
				assert.equal(error.message.includes('Invalid image'), true);
				return true;
			});
		});

	});
});
