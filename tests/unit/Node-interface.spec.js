'use strict';

var assert = require('assert');
var fs = require('fs/promises');
var path = require('path');
var os = require('os');

var pdfmake = require('../../js/index');

pdfmake.addFonts({
	Roboto: {
		normal: 'fonts/Roboto/Roboto-Regular.ttf',
		bold: 'fonts/Roboto/Roboto-Medium.ttf',
		italics: 'fonts/Roboto/Roboto-Italic.ttf',
		bolditalics: 'fonts/Roboto/Roboto-MediumItalic.ttf'
	}
});

describe('Node interface', function () {
	describe('getBuffer', function () {
		it('should return buffer', async function () {

			var docDefinition = {
				content: [
					'First paragraph',
					'Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines'
				]
			};

			var pdf = pdfmake.createPdf(docDefinition);
			await pdf.getBuffer().then(() => {
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

	describe('setUrlAccessPolicy', function () {
		it('should set url access policy', async function () {

			var docDefinition = {
				content: [
					'First paragraph',
					'Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines',
					{ image: 'test1' }
				],
				images: {
					test1: 'https://localhost/image.png'
				}
			};

			pdfmake.setUrlAccessPolicy((url) => {
				const parsedUrl = new URL(url);

				if (parsedUrl.hostname === 'localhost') {
					return false;
				}

				return true;
			});

			await assert.rejects(async function () {
				var pdf = pdfmake.createPdf(docDefinition);
				await pdf.getBuffer();
			}, function (error) {
				assert.equal(error.message, `Access to URL denied by resource access policy: https://localhost/image.png`);
				return true;
			});
		});

	});
});
