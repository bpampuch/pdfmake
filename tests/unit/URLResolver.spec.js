'use strict';

var assert = require('assert');
var sinon = require('sinon');
var VirtualFileSystem = require('../../js/virtual-fs').VirtualFileSystem;
var URLResolver = require('../../js/URLResolver').default;
var PdfMake = require('../../js/base').default;

describe('Document virtual file system', function () {
	var shared, document, resolver, fetchStub;
	var url = 'https://example.com/resource';

	beforeEach(function () {
		shared = new VirtualFileSystem();
		document = new VirtualFileSystem(shared);
		resolver = new URLResolver(document, shared);
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

	it('should write shared downloads where other documents can read them', async function () {
		var headers = { Authorization: 'Bearer token' };
		await resolver.resolve(url, headers, true);
		var nextDocument = new VirtualFileSystem(shared);
		await new URLResolver(nextDocument, shared).resolve(url);
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
