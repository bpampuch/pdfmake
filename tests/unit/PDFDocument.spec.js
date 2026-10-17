'use strict';

var assert = require('assert');

var PDFDocument = require('../../js/PDFDocument').default;

describe('PDFDocument', function () {
	var pdfDocument;

	beforeEach(function () {
		var fontDefinitions = {
			Roboto: {
				normal: 'fonts/Roboto/Roboto-Regular.ttf',
				bold: 'fonts/Roboto/Roboto-Medium.ttf',
				italics: 'fonts/Roboto/Roboto-Italic.ttf',
				bolditalics: 'fonts/Roboto/Roboto-MediumItalic.ttf'
			}
		};
		pdfDocument = new PDFDocument(fontDefinitions);
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

		// TODO

	});

	describe('provideAttachment', function () {

		it('should resolve a named VFS attachment without changing its metadata or original definition', function () {
			var content = Buffer.from('Attachment contents');
			var attachment = { src: 'report.txt', name: 'report.txt', description: 'Report description' };
			pdfDocument.attachments = { report: attachment };
			pdfDocument.virtualfs = {
				existsSync: filename => filename === 'report.txt',
				readFileSync: () => content
			};

			assert.deepStrictEqual(pdfDocument.provideAttachment('report'), { ...attachment, src: content });
			assert.strictEqual(attachment.src, 'report.txt');
		});

		it('should resolve an inline VFS attachment without changing its metadata or original definition', function () {
			var content = Buffer.from('Attachment contents');
			var attachment = { src: 'report.txt', name: 'report.txt', description: 'Report description' };
			pdfDocument.virtualfs = {
				existsSync: filename => filename === 'report.txt',
				readFileSync: () => content
			};

			assert.deepStrictEqual(pdfDocument.provideAttachment(attachment), { ...attachment, src: content });
			assert.strictEqual(attachment.src, 'report.txt');
		});

		it('should enforce the local access policy for inline attachments', function () {
			pdfDocument.localAccessPolicy = () => false;

			assert.throws(() => pdfDocument.provideAttachment({ src: 'report.txt' }), /Access to local file denied/);
		});

	});

	describe('resolveColor', function () {

		it('should resolve valid color name', function () {
			assert.equal(pdfDocument.resolveColor('red'), 'red');
		});

		it('should resolve default color', function () {
			assert.equal(pdfDocument.resolveColor(undefined, 'red'), 'red');
		});

		it('should resolve hex color', function () {
			 assert.equal(pdfDocument.resolveColor('#f900f8'), '#f900f8');
		});

		it('should resolve invalid color name', function () {
			assert.equal(pdfDocument.resolveColor('invalid'), null);
		});

		it('should resolve invalid color name with default', function () {
			assert.equal(pdfDocument.resolveColor('invalid', 'red'), 'red');
		});

	});

});
