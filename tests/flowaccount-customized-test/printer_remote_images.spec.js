'use strict';

var assert = require('assert');
var sinon = require('sinon');
var PdfPrinter = require('../../src/printer');

describe('FlowAccount Remote Image Resolution', function () {
	var REMOTE_URL = 'https://example.com/logo.png';
	var fetchStub;
	var printer;

	beforeEach(function () {
		printer = new PdfPrinter({});

		fetchStub = sinon.stub(global, 'fetch').callsFake(function () {
			return Promise.resolve({
				ok: true,
				arrayBuffer: function () {
					return Promise.resolve(Uint8Array.from([1, 2, 3, 4]).buffer);
				}
			});
		});
	});

	afterEach(function () {
		if (fetchStub && fetchStub.restore) {
			fetchStub.restore();
		}
	});

	it('resolves remote inline images and caches results', async function () {
		var docDefinition = {
			content: [
				{ image: REMOTE_URL }
			]
		};

		await printer.resolveRemoteImages(docDefinition);

		assert.strictEqual(fetchStub.callCount, 1, 'fetch called once for initial resolution');
		assert.ok(docDefinition.images, 'images map is created');
		assert.ok(Buffer.isBuffer(docDefinition.images[REMOTE_URL]), 'resolved image stored as Buffer');
		assert.strictEqual(docDefinition.content[0].image, REMOTE_URL, 'inline image rewired to cache key');

		var resolvedFlag = Object.getOwnPropertyDescriptor(docDefinition, '__pdfMakeRemoteImagesResolved');
		assert.ok(resolvedFlag, 'resolution flag defined');
		assert.strictEqual(resolvedFlag.enumerable, false, 'resolution flag is non-enumerable');
		assert.strictEqual(docDefinition.__pdfMakeRemoteImagesResolved, true, 'resolution flag set to true');

		var secondDefinition = {
			content: [
				{ image: REMOTE_URL }
			]
		};

		await printer.resolveRemoteImages(secondDefinition);

		assert.strictEqual(fetchStub.callCount, 1, 'subsequent resolution served from cache');
		assert.ok(Buffer.isBuffer(secondDefinition.images[REMOTE_URL]), 'second definition receives cached buffer');
	});
});
