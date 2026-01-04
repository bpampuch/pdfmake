'use strict';

var assert = require('assert');
var fs = require('fs/promises');
var path = require('path');
var os = require('os');

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

	describe('write', function () {
		it('should write file', async function () {

			var docDefinition = {
				content: [
					'First paragraph',
					'Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines'
				]
			};

			const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdfmake-'));
			const pdfFilename = path.join(tmpDir, 'document.pdf');

			var pdf = pdfmake.createPdf(docDefinition);
			await pdf.write(pdfFilename);

			const stats = await fs.stat(pdfFilename);
			assert.ok(stats.size > 0);

			await fs.rm(tmpDir, { recursive: true, force: true });
		});

	});
});
