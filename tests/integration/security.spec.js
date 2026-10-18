'use strict';

var assert = require('assert');

var Printer = require('../../js/Printer').default;
var virtualfs = require('../../js/virtual-fs').default;
var URLResolver = require('../../js/URLResolver').default;

async function renderPdf(options) {
	var printer = new Printer({ Roboto: { normal: 'fonts/Roboto/Roboto-Regular.ttf' } }, virtualfs, new URLResolver(virtualfs));
	var document = await printer.createPdfKitDocument(Object.assign({ content: ['secured text'] }, options));
	return new Promise(function (resolve, reject) {
		var chunks = [];
		document.on('data', chunk => chunks.push(chunk));
		document.on('error', reject);
		document.on('end', () => resolve(Buffer.concat(chunks).toString('latin1')));
		document.end();
	});
}

describe('PDF security', function () {
	it('should create a password-protected PDF with an encryption dictionary', async function () {
		var pdf = await renderPdf({ userPassword: 'reader-password', ownerPassword: 'owner-password' });
		assert.match(pdf, /\/Encrypt \d+ 0 R/);
		assert.match(pdf, /\/Filter \/Standard/);
		assert.match(pdf, /\/O <[0-9a-f]+>/);
		assert.match(pdf, /\/U <[0-9a-f]+>/);
		assert(!pdf.includes('reader-password'));
		assert(!pdf.includes('owner-password'));
	});

	it('should leave PDFs without passwords unencrypted', async function () {
		var pdf = await renderPdf({});
		assert.doesNotMatch(pdf, /\/Encrypt \d+ 0 R/);
	});

	[{ printing: true, copying: false }, { printing: false, copying: true }].forEach(function (permissions) {
		it('should encode printing=' + permissions.printing + ' and copying=' + permissions.copying + ' in PDF permissions', async function () {
			var pdf = await renderPdf({ version: '1.3', ownerPassword: 'owner-password', permissions: permissions });
			var match = pdf.match(/\/P (-?\d+)/);
			assert(match, 'Encrypted PDF should contain permission flags');
			var flags = Number(match[1]);
			assert.equal(Boolean(flags & 4), permissions.printing);
			assert.equal(Boolean(flags & 16), permissions.copying);
		});
	});
});
