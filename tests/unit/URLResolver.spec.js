'use strict';

var assert = require('assert');
var sinon = require('sinon');
var VirtualFileSystem = require('../../js/virtual-fs').VirtualFileSystem;
var URLResolver = require('../../js/URLResolver').default;
var defaultUrlProtocols = require('../../js/URLResolver').defaultUrlProtocols;
var PdfMake = require('../../js/base').default;

describe('Document virtual file system', function () {
	var shared, document, resolver, fetchStub;
	var url = 'https://example.com/resource';

	beforeEach(function () {
		shared = new VirtualFileSystem();
		document = new VirtualFileSystem(shared);
		resolver = new URLResolver(document, shared, 5, defaultUrlProtocols);
		fetchStub = sinon.stub(globalThis, 'fetch').callsFake(async function () {
			return { ok: true, status: 200, arrayBuffer: async () => Buffer.from('download') };
		});
	});

	afterEach(function () {
		sinon.restore();
	});

	it('should read shared files before document files and preserve encoding', function () {
		document.writeFileSync(url, 'document');
		shared.writeFileSync(url, 'shared');
		assert.equal(document.existsSync(url), true);
		assert.equal(document.readFileSync(url, 'utf8'), 'shared');
		assert.equal(document.readFileSync(url, { encoding: 'utf8' }), 'shared');
		assert.throws(() => document.readFileSync('missing'), /not found/);
	});

	it('should ignore non-string inputs without serializing or tracking them', async function () {
		var circular = {};
		circular.self = circular;
		var inputs = [undefined, null, 42, false, Buffer.from('font'), new Uint8Array([1, 2]), new ArrayBuffer(2), circular];

		for (const input of inputs) {
			var result = resolver.resolve(input);
			assert.ok(result instanceof Promise);
			await result;
		}
		await resolver.resolved();

		sinon.assert.notCalled(fetchStub);
		assert.deepStrictEqual(resolver.resolving, {});
	});

	it('should download once into the document VFS by default', async function () {
		await Promise.all([resolver.resolve(url), resolver.resolve(url, {}, false)]);
		await resolver.resolved();
		sinon.assert.calledOnce(fetchStub);
		assert.equal(document.readFileSync(url, 'utf8'), 'download');
		assert.equal(shared.existsSync(url), false);
		assert.equal(new VirtualFileSystem(shared).existsSync(url), false);
	});

	[1, 2, 5].forEach(function (concurrency) {
		it('should limit downloads to ' + concurrency + ' until response bodies finish', async function () {
			resolver = new URLResolver(document, shared, concurrency, defaultUrlProtocols);
			var finishBodies = [];
			fetchStub.callsFake(async function () {
				return {
					ok: true,
					arrayBuffer: () => new Promise(resolve => finishBodies.push(() => resolve(Buffer.from('download'))))
				};
			});
			var downloads = Array.from({ length: 8 }, (_, index) => resolver.resolve(url + '/' + index));
			assert.strictEqual(resolver.resolve(url + '/0'), downloads[0]);
			var complete = false;
			var all = resolver.resolved().then(() => { complete = true; });
			await new Promise(resolve => setImmediate(resolve));
			assert.strictEqual(fetchStub.callCount, concurrency);
			assert.strictEqual(complete, false);

			for (var index = 0; index < downloads.length; index++) {
				finishBodies.shift()();
				await new Promise(resolve => setImmediate(resolve));
				assert.strictEqual(fetchStub.callCount, Math.min(downloads.length, concurrency + index + 1));
			}
			await all;
			for (var resource = 0; resource < downloads.length; resource++) {
				assert.strictEqual(document.readFileSync(url + '/' + resource, 'utf8'), 'download');
			}
		});
	});

	['fetch', 'body', 'policy', 'write'].forEach(function (failure) {
		it('should release the download slot after a ' + failure + ' failure', async function () {
			resolver = new URLResolver(document, shared, 1, defaultUrlProtocols);
			if (failure === 'fetch') fetchStub.onFirstCall().rejects(new Error('download failed'));
			if (failure === 'body') fetchStub.onFirstCall().resolves({ ok: true, arrayBuffer: async () => { throw new Error('download failed'); } });
			if (failure === 'policy') resolver.setUrlAccessPolicy(resource => resource !== url);
			if (failure === 'write') sinon.stub(document, 'writeFileSync').onFirstCall().throws(new Error('download failed')).callThrough();
			var first = resolver.resolve(url);
			var second = resolver.resolve(url + '/next');
			var rejected = assert.rejects(first, /download failed|Access to URL denied/);
			await assert.rejects(resolver.resolved(), /download failed|Access to URL denied/);
			await rejected;
			await second;
			assert.strictEqual(document.readFileSync(url + '/next', 'utf8'), 'download');
		});
	});

	it('should apply the configured concurrency to createPdf downloads', async function () {
		var pdfmake = new PdfMake();
		pdfmake.setUrlAccessPolicy(() => true);
		pdfmake.localAccessPolicy = () => true;
		pdfmake.setUrlResourceConcurrency(1);
		var finishFirst;
		fetchStub.onFirstCall().resolves({
			ok: true,
			arrayBuffer: () => new Promise(resolve => { finishFirst = () => resolve(Buffer.from('download')); })
		});
		var result = pdfmake.createPdf({ content: [], images: { first: url, second: url + '/next' } });
		await new Promise(resolve => setImmediate(resolve));
		sinon.assert.calledOnce(fetchStub);
		finishFirst();
		await result;
		sinon.assert.calledTwice(fetchStub);
	});

	it('should reject invalid concurrency limits without changing the current setting', function () {
		var pdfmake = new PdfMake();
		assert.strictEqual(pdfmake.urlResourceConcurrency, 5);
		pdfmake.setUrlResourceConcurrency(2);
		[undefined, null, 0, -1, 1.5, NaN, Infinity, '2', true, {}, []].forEach(function (value) {
			assert.throws(() => pdfmake.setUrlResourceConcurrency(value), /positive integer/);
			assert.strictEqual(pdfmake.urlResourceConcurrency, 2);
			assert.throws(() => new URLResolver(document, shared, value, defaultUrlProtocols), /positive integer/);
		});
		assert.throws(() => new URLResolver(document, shared, undefined, defaultUrlProtocols), /positive integer/);
	});

	it('should write shared downloads where other documents can read them', async function () {
		var headers = { Authorization: 'Bearer token' };
		await resolver.resolve(url, headers, true);
		var nextDocument = new VirtualFileSystem(shared);
		await new URLResolver(nextDocument, shared, 5, defaultUrlProtocols).resolve(url);
		sinon.assert.calledOnceWithExactly(fetchStub, url, { headers: headers, redirect: 'manual' });
		assert.equal(shared.readFileSync(url, 'utf8'), 'download');
		assert.equal(nextDocument.readFileSync(url, 'utf8'), 'download');
	});

	it('should reuse an existing shared file for a document download', async function () {
		shared.writeFileSync(url, 'registered');
		await resolver.resolve(url, {}, false);
		sinon.assert.notCalled(fetchStub);
		assert.equal(document.readFileSync(url, 'utf8'), 'registered');
		assert.deepStrictEqual(document.storage, {});
	});

	it('should keep concurrent createPdf calls isolated and reuse shared downloads', async function () {
		var pdfmake = new PdfMake();
		pdfmake.sharedVirtualfs = shared;
		pdfmake.setUrlAccessPolicy(() => true);
		pdfmake.localAccessPolicy = () => true;
		var createDocument = cacheDownload => pdfmake.createPdf({
			content: [],
			images: { resource: { url: url, cache: cacheDownload } }
		});

		var documents = await Promise.all([createDocument(false), createDocument(false)]);
		sinon.assert.calledTwice(fetchStub);
		assert.notStrictEqual(documents[0].virtualfs, documents[1].virtualfs);
		assert.equal(shared.existsSync(url), false);
		documents[0].virtualfs.writeFileSync('private', 'first document');
		assert.equal(documents[1].virtualfs.existsSync('private'), false);

		await createDocument(true);
		await createDocument(false);
		assert.equal(fetchStub.callCount, 3);
		assert.equal(shared.existsSync(url), true);
	});

	[false, true].forEach(function (enabled) {
		it('should apply the URL resource caching default ' + enabled + ' and respect per-resource overrides', async function () {
			var pdfmake = new PdfMake();
			pdfmake.sharedVirtualfs = shared;
			pdfmake.setUrlResourceCaching(enabled);
			pdfmake.setUrlAccessPolicy(() => true);
			pdfmake.localAccessPolicy = () => true;
			var resources = {
				plain: url + '/plain',
				implicit: { url: url + '/implicit' },
				undefined: { url: url + '/undefined', cache: undefined },
				cache: { url: url + '/shared', cache: true },
				private: { url: url + '/private', cache: false }
			};
			var definitions = { content: [], images: {}, attachments: {}, files: {} };
			var expectations = [];
			var fonts = {};
			for (const name of Object.keys(resources)) {
				var source = resources[name];
				var expected = name === 'cache' || (name !== 'private' && enabled);
				var resourceUrl = typeof source === 'string' ? source : source.url;
				for (const type of ['image', 'attachment', 'file', 'font', 'collection']) {
					var typedUrl = resourceUrl + '/' + type;
					var typedSource = typeof source === 'string' ? typedUrl : { ...source, url: typedUrl };
					expectations.push({ url: typedUrl, cache: expected });
					if (type === 'image') definitions.images[name] = typedSource;
					if (type === 'attachment') definitions.attachments[name] = { src: typedSource };
					if (type === 'file') definitions.files[name] = { src: typedSource };
					if (type === 'font') fonts[name] = { normal: typedSource };
					if (type === 'collection') fonts[name + 'Collection'] = { normal: [typedSource, 'CollectionFont'] };
				}
			}
			pdfmake.setFonts(fonts);
			await pdfmake.createPdf(definitions);
			assert.strictEqual(fetchStub.callCount, expectations.length);
			for (const expected of expectations) {
				assert.strictEqual(shared.existsSync(expected.url), expected.cache, expected.url);
			}
			await pdfmake.createPdf(definitions);
			assert.strictEqual(fetchStub.callCount, expectations.length + expectations.filter(resource => !resource.cache).length);
		});
	});

	it('should switch the default between documents without changing a generation already started', async function () {
		var pdfmake = new PdfMake();
		pdfmake.sharedVirtualfs = shared;
		pdfmake.setUrlAccessPolicy(() => true);
		pdfmake.localAccessPolicy = () => true;
		var createDocument = suffix => pdfmake.createPdf({ content: [], images: { resource: url + suffix } });
		pdfmake.setUrlResourceCaching(true);
		var first = createDocument('/first');
		pdfmake.setUrlResourceCaching(false);
		var second = createDocument('/second');
		await Promise.all([first, second]);
		assert.strictEqual(shared.existsSync(url + '/first'), true);
		assert.strictEqual(shared.existsSync(url + '/second'), false);
	});

	it('should clear shared HTTP resources regardless of protocol case and preserve other VFS files', function () {
		var pdfmake = new PdfMake();
		pdfmake.sharedVirtualfs = shared;
		pdfmake.setUrlResourceCaching(true);
		var urls = ['http://example.com/a', 'https://example.com/b', 'HTTP://example.com/c', 'HTTPS://example.com/d', 'HtTpS://example.com/e'];
		var files = ['Roboto-Regular.ttf', 'images/logo.png', 'https-logo.png'];
		urls.concat(files).forEach(filename => shared.writeFileSync(filename, 'content'));
		document.writeFileSync(url + '/private', 'document content');

		pdfmake.clearUrlResourceCache();
		pdfmake.clearUrlResourceCache();

		assert.deepStrictEqual(Object.keys(shared.storage), files);
		assert.strictEqual(document.readFileSync(url + '/private', 'utf8'), 'document content');
		assert.strictEqual(pdfmake.urlResourceCaching, true);
	});

	it('should download resources again after clearing the shared URL cache', async function () {
		var pdfmake = new PdfMake();
		pdfmake.sharedVirtualfs = shared;
		pdfmake.setUrlResourceCaching(true);
		pdfmake.setUrlAccessPolicy(() => true);
		pdfmake.localAccessPolicy = () => true;
		var createDocument = () => pdfmake.createPdf({ content: [], images: { resource: url } });
		await createDocument();
		await createDocument();
		sinon.assert.calledOnce(fetchStub);

		pdfmake.clearUrlResourceCache();
		await createDocument();

		sinon.assert.calledTwice(fetchStub);
		assert.strictEqual(shared.existsSync(url), true);
	});

	it('should reject non-boolean URL resource caching defaults without changing the current setting', function () {
		var pdfmake = new PdfMake();
		assert.strictEqual(pdfmake.urlResourceCaching, false);
		pdfmake.setUrlResourceCaching(true);
		[undefined, null, 0, 1, 'false', {}, []].forEach(function (value) {
			assert.throws(() => pdfmake.setUrlResourceCaching(value), /Boolean expected/);
			assert.strictEqual(pdfmake.urlResourceCaching, true);
		});
	});
});
