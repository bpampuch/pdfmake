'use strict';

var assert = require('assert');
var sinon = require('sinon');
var PdfMake = require('../../js/base').default;
var VirtualFileSystem = require('../../js/virtual-fs').VirtualFileSystem;

describe('URL protocol registration', function () {
	var pdfmake, fetchStub;
	var url = 'https://example.com/image';
	var buffer = new Uint8Array([1, 2, 3]).buffer;

	beforeEach(function () {
		pdfmake = new PdfMake();
		pdfmake.sharedVirtualfs = new VirtualFileSystem();
		pdfmake.setUrlAccessPolicy(() => true);
		pdfmake.localAccessPolicy = () => true;
		fetchStub = sinon.stub(globalThis, 'fetch').resolves({
			ok: true, status: 200, arrayBuffer: async () => buffer
		});
	});

	afterEach(function () {
		sinon.restore();
	});

	function createDocument(resource = url) {
		return pdfmake.createPdf({ content: [], images: { image: resource } });
	}

	it('should replace HTTPS downloads and pass headers and a URL validator', async function () {
		var headers = { Authorization: 'Bearer token' };
		var handler = sinon.stub().resolves({ buffer: buffer, url: url });
		pdfmake.registerUrlProtocol('HTTPS:', handler);
		var document = await createDocument({ url: url, headers: headers });
		sinon.assert.calledOnceWithExactly(handler, url, headers, sinon.match.func);
		var validateUrlAccessPolicy = handler.firstCall.args[2];
		assert.strictEqual(validateUrlAccessPolicy(url), undefined);
		sinon.assert.notCalled(fetchStub);
		assert.strictEqual(document.virtualfs.readFileSync(url), buffer);

		await createDocument('http://example.com/image');
		sinon.assert.calledOnce(fetchStub);
	});

	it('should provide a callable URL validator when no policy is configured', async function () {
		sinon.stub(console, 'warn');
		pdfmake.setUrlAccessPolicy(undefined);
		var handler = sinon.stub().resolves({ buffer: buffer, url: url });
		pdfmake.registerUrlProtocol('https', handler);
		await createDocument();
		assert.strictEqual(handler.firstCall.args[2](url), undefined);
	});

	it('should throw from the handler validator unless the policy explicitly allows access', async function () {
		var target = 'https://forbidden.example/image';
		var decision;
		pdfmake.setUrlAccessPolicy(resource => resource === url ? true : decision);
		var handler = sinon.stub().resolves({ buffer: buffer, url: url });
		pdfmake.registerUrlProtocol('https', handler);
		await createDocument();
		var validateUrlAccessPolicy = handler.firstCall.args[2];
		[false, undefined, 1].forEach(value => {
			decision = value;
			assert.throws(() => validateUrlAccessPolicy(target), {
				message: 'Access to URL denied by resource access policy: ' + target
			});
		});
	});

	it('should validate an allowed redirect inside a custom handler', async function () {
		var target = 'https://example.com/redirected';
		var policy = sinon.spy(resource => resource === url || resource === target);
		pdfmake.setUrlAccessPolicy(policy);
		pdfmake.registerUrlProtocol('https', async (resource, headers, validateUrlAccessPolicy) => {
			assert.strictEqual(resource, url);
			assert.strictEqual(validateUrlAccessPolicy(target), undefined);
			sinon.assert.calledWithExactly(policy, target);
			return { buffer: buffer, url: target };
		});
		var document = await createDocument();
		assert.strictEqual(document.virtualfs.readFileSync(url), buffer);
	});

	it('should support custom protocols, deduplicate downloads and clear shared cache', async function () {
		var resource = 'asset://images/logo';
		var handler = sinon.stub().resolves({ buffer: buffer, url: resource });
		pdfmake.registerUrlProtocol('asset', handler);
		pdfmake.setUrlResourceCaching(true);
		await pdfmake.createPdf({ content: [], images: { first: resource, second: resource } });
		await createDocument(resource);
		sinon.assert.calledOnce(handler);
		assert.strictEqual(pdfmake.sharedVirtualfs.readFileSync(resource), buffer);
		pdfmake.clearUrlResourceCache();
		await createDocument(resource);
		sinon.assert.calledTwice(handler);
		sinon.assert.notCalled(fetchStub);
	});

	it('should validate the initial URL before calling a custom handler', async function () {
		var handler = sinon.stub();
		pdfmake.registerUrlProtocol('https', handler);
		pdfmake.setUrlAccessPolicy(() => false);
		await assert.rejects(createDocument(), /Access to URL denied/);
		sinon.assert.notCalled(handler);
	});

	it('should reject a forbidden final URL without caching its data', async function () {
		pdfmake.registerUrlProtocol('https', async () => ({ buffer: buffer, url: 'https://forbidden.example/image' }));
		pdfmake.setUrlAccessPolicy(resource => resource === url);
		pdfmake.setUrlResourceCaching(true);
		await assert.rejects(createDocument(), /Access to URL denied.*forbidden/);
		assert.strictEqual(pdfmake.sharedVirtualfs.existsSync(url), false);
	});

	['replaced', 'unregistered'].forEach(function (change) {
		it('should keep queued document handlers when the protocol is ' + change, async function () {
			pdfmake.setUrlResourceConcurrency(1);
			var finish;
			var handler = sinon.stub().callsFake(() => new Promise(resolve => {
				finish = () => resolve({ buffer: buffer, url: url });
			}));
			handler.onSecondCall().resolves({ buffer: buffer, url: url + '/next' });
			var replacement = sinon.stub().resolves({ buffer: buffer, url: url });
			pdfmake.registerUrlProtocol('https', handler);
			var pending = pdfmake.createPdf({ content: [], images: { first: url, second: url + '/next' } });
			if (change === 'replaced') {
				pdfmake.registerUrlProtocol('https', replacement);
			} else {
				pdfmake.unregisterUrlProtocol('https');
			}
			finish();
			var document = await pending;
			sinon.assert.calledTwice(handler);
			assert.strictEqual(document.virtualfs.readFileSync(url + '/next'), buffer);
			sinon.assert.notCalled(replacement);
			await createDocument();
			sinon.assert.calledTwice(handler);
			assert.strictEqual(replacement.callCount, change === 'replaced' ? 1 : 0);
			sinon.assert.notCalled(fetchStub);
		});
	});

	it('should use the default handler for manual redirects', async function () {
		fetchStub.onFirstCall().resolves({ status: 302, headers: { get: () => '/redirected' } });
		var policy = sinon.spy(() => true);
		pdfmake.setUrlAccessPolicy(policy);
		var document = await createDocument();
		sinon.assert.calledWithExactly(fetchStub, 'https://example.com/redirected', { headers: {}, redirect: 'manual' });
		sinon.assert.calledWithExactly(policy, 'https://example.com/redirected');
		assert.strictEqual(document.virtualfs.readFileSync(url), buffer);
	});

	it('should validate manual redirect targets before requesting them', async function () {
		fetchStub.onFirstCall().resolves({ status: 302, headers: { get: () => 'https://forbidden.example/image' } });
		pdfmake.setUrlAccessPolicy(resource => resource === url);
		await assert.rejects(createDocument(), /Access to URL denied/);
		sinon.assert.calledOnce(fetchStub);
	});

	it('should validate browser redirect targets before reading their bodies', async function () {
		var readBody = sinon.stub().resolves(buffer);
		fetchStub.onFirstCall().resolves({ type: 'opaqueredirect' });
		fetchStub.onSecondCall().resolves({ ok: true, redirected: true, url: 'https://forbidden.example/image', arrayBuffer: readBody });
		pdfmake.setUrlAccessPolicy(resource => resource === url);
		await assert.rejects(createDocument(), /Access to URL denied/);
		sinon.assert.calledTwice(fetchStub);
		sinon.assert.notCalled(readBody);
	});

	it('should remove an overridden default protocol without restoring fetch', async function () {
		var handler = sinon.stub();
		pdfmake.registerUrlProtocol('https', handler);
		pdfmake.unregisterUrlProtocol('https');
		await createDocument();
		sinon.assert.notCalled(handler);
		sinon.assert.notCalled(fetchStub);
		await createDocument('http://example.com/image');
		sinon.assert.calledOnce(fetchStub);
	});

	['https', 'asset'].forEach(function (protocol) {
		it('should clear only shared cache for ' + protocol + ' when unregistering', async function () {
			var resource = protocol + '://images/logo';
			var handler = sinon.stub().resolves({ buffer: buffer, url: resource });
			pdfmake.registerUrlProtocol(protocol, handler);
			pdfmake.setUrlResourceCaching(true);
			await createDocument(resource);
			var uppercase = protocol.toUpperCase() + '://images/uppercase';
			pdfmake.sharedVirtualfs.writeFileSync(uppercase, buffer);
			var preserved = ['http://example.com/image', 'Roboto-Regular.ttf', protocol + '-other://logo', protocol + '-logo.png'];
			preserved.forEach(filename => pdfmake.sharedVirtualfs.writeFileSync(filename, buffer));
			pdfmake.unregisterUrlProtocol(protocol.toUpperCase() + ':');
			assert.deepStrictEqual(Object.keys(pdfmake.sharedVirtualfs.storage), preserved);
			var document = await createDocument(resource);
			assert.strictEqual(document.virtualfs.existsSync(resource), false);
			sinon.assert.calledOnce(handler);
			sinon.assert.notCalled(fetchStub);

			pdfmake.sharedVirtualfs.writeFileSync(resource, buffer);
			pdfmake.unregisterUrlProtocol(protocol);
			assert.strictEqual(pdfmake.sharedVirtualfs.existsSync(resource), false);
		});
	});

	it('should restore the default downloader with an omitted or undefined handler', async function () {
		pdfmake.setUrlResourceCaching(true);
		var handler = sinon.stub();
		pdfmake.registerUrlProtocol('https', handler);
		for (const args of [[], [undefined]]) {
			pdfmake.registerUrlProtocol('HTTPS:', ...args);
			var document = await createDocument();
			assert.strictEqual(document.virtualfs.readFileSync(url), buffer);
			pdfmake.unregisterUrlProtocol('https');
			assert.strictEqual(pdfmake.sharedVirtualfs.existsSync(url), false);
		}
		sinon.assert.notCalled(handler);
		sinon.assert.calledTwice(fetchStub);
	});

	it('should use the default downloader for a new protocol when the handler is omitted', async function () {
		var resource = 'asset://images/logo';
		pdfmake.registerUrlProtocol('asset');
		var document = await createDocument(resource);
		sinon.assert.calledOnceWithExactly(fetchStub, resource, { headers: {}, redirect: 'manual' });
		assert.strictEqual(document.virtualfs.readFileSync(resource), buffer);
	});

	it('should reject malformed handler responses before writing to either VFS', async function () {
		sinon.stub(console, 'warn');
		pdfmake.setUrlAccessPolicy(undefined);
		var write = sinon.spy(VirtualFileSystem.prototype, 'writeFileSync');
		var responses = [
			undefined, null, 'invalid',
			{ url: url }, { buffer: null, url: url }, { buffer: 'invalid', url: url }, { buffer: {}, url: url },
			{ buffer: buffer }, { buffer: buffer, url: 123 }, { buffer: buffer, url: '' }, { buffer: buffer, url: ' \t\n' }
		];
		for (const response of responses) {
			pdfmake.registerUrlProtocol('https', async () => response);
			await assert.rejects(createDocument({ url: url, cache: true }), error =>
				error.message.startsWith('Invalid protocol handler response') && error.message.includes(url),
				'Invalid response: ' + JSON.stringify(response));
		}
		sinon.assert.notCalled(write);
	});

	it('should release the queue after validation fails before checking the final URL policy', async function () {
		pdfmake.setUrlResourceConcurrency(1);
		pdfmake.setUrlResourceCaching(true);
		pdfmake.setUrlAccessPolicy(resource => {
			assert.strictEqual(typeof resource, 'string');
			return true;
		});
		var handler = sinon.stub();
		handler.onFirstCall().resolves({ buffer: buffer });
		handler.onSecondCall().resolves({ buffer: buffer, url: url + '/next' });
		pdfmake.registerUrlProtocol('https', handler);
		await assert.rejects(pdfmake.createPdf({ content: [], images: { first: url, second: url + '/next' } }), /Invalid protocol handler response/);
		await new Promise(resolve => setImmediate(resolve));
		assert.strictEqual(pdfmake.sharedVirtualfs.existsSync(url), false);
		assert.strictEqual(pdfmake.sharedVirtualfs.readFileSync(url + '/next'), buffer);
	});

	it('should accept empty ArrayBuffers and binary views including Node buffers', async function () {
		for (var data of [new ArrayBuffer(0), new Uint8Array([1, 2]), Buffer.from('image')]) {
			pdfmake.registerUrlProtocol('https', async () => ({ buffer: data, url: url }));
			var document = await createDocument();
			assert.strictEqual(document.virtualfs.readFileSync(url), data);
		}
	});

	it('should reject invalid registrations', function () {
		[undefined, null, 42, {}, '', '1https', 'https://', 'https path'].forEach(protocol => {
			assert.throws(() => pdfmake.registerUrlProtocol(protocol, async () => {}), /URL scheme expected/);
			assert.throws(() => pdfmake.unregisterUrlProtocol(protocol), /URL scheme expected/);
		});
		[null, {}, 'fetch'].forEach(handler => {
			assert.throws(() => pdfmake.registerUrlProtocol('https', handler), /Function expected/);
		});
		assert.strictEqual(pdfmake.urlProtocols.size, 2);
	});
});
