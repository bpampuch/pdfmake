var assert = require('assert');
var fs = require('fs');
var pdfmake = require('../../build/pdfmake.js');

describe('Browser URL protocols', function () {
	it('should embed an image downloaded by a custom protocol handler', async function () {
		var protocol = 'test-image';
		var url = protocol + '://logo';
		var image = fs.readFileSync('examples/images/sampleImage.jpg');
		var policy = pdfmake.urlAccessPolicy;
		try {
			pdfmake.setUrlAccessPolicy(resource => resource === url);
			pdfmake.registerUrlProtocol(protocol, async (resource, headers, validateUrlAccessPolicy) => {
				assert.strictEqual(resource, url);
				assert.deepStrictEqual(headers, { Authorization: 'Bearer token' });
				assert.strictEqual(validateUrlAccessPolicy(resource), undefined);
				assert.throws(() => validateUrlAccessPolicy('test-image://forbidden'), /Access to URL denied by resource access policy/);
				return { buffer: image.buffer.slice(image.byteOffset, image.byteOffset + image.byteLength), url: resource };
			});
			var buffer = await pdfmake.createPdf({
				content: [{ image: 'logo', width: 100 }],
				images: { logo: { url: url, headers: { Authorization: 'Bearer token' }, cache: true } }
			}).getBuffer();
			assert.strictEqual(buffer.subarray(0, 5).toString(), '%PDF-');
			assert.ok(buffer.toString('latin1').includes('/Subtype /Image'));
			assert.strictEqual(pdfmake.sharedVirtualfs.existsSync(url), true);
		} finally {
			pdfmake.setUrlAccessPolicy(policy);
			pdfmake.unregisterUrlProtocol(protocol);
		}
		assert.strictEqual(pdfmake.sharedVirtualfs.existsSync(url), false);
	});
});
