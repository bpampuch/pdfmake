var assert = require('assert');
var pdfmake = require('./../../build/pdfmake.js');
var pdfFonts = require('./../../build/vfs_fonts.js');
pdfmake.addVirtualFileSystem(pdfFonts);

describe('core-js polyfill', function () {
	it('Object.isExtensible bug', async function () {
		var docDefinition = {
			content: [
				'Empty document'
			]
		};

		var pdf = pdfmake.createPdf(docDefinition);
		await pdf.getStream().then(() => {
			// noop
		}, () => {
			// noop
		});

		assert.equal(Object.isExtensible(docDefinition), true);
	});
});
