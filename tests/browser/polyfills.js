var assert = require('assert');
var pdfmake = require('./../../build/pdfmake.js');
var pdfFonts = require('./../../build/vfs_fonts.js');
pdfmake.addVirtualFileSystem(pdfFonts);

describe('core-js polyfill', function () {
	it('Object.isExtensible bug', function () {
		var docDefinition = {
			content: [
				'Empty document'
			],
			defaultStyle: {
				font: 'Roboto'
			}
		};

		var pdf = pdfmake.createPdf(docDefinition);
		
		// Test that the docDefinition object is still extensible after createPdf
		assert.equal(Object.isExtensible(docDefinition), true);
	});
});
