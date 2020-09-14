
'use strict';

var assert = require('assert');
var mock = require('xhr-mock').default;
var Blob = require('node-blob');

var URLBrowserResolver = require('../../../js/browser-extensions/URLBrowserResolver').default;
var VirtualFileSystem = require('../../../js/virtual-fs').default;
const myBlob = new Blob(["something"], { type: 'image/png' });

describe('URLBrowserResolver', function () {
	describe('resolve', function () {
		beforeEach(function () {  mock.setup(); });
		afterEach(function () { mock.teardown(); });

		it('returns nothing if invalid url given', async function () {
      var resolver = new URLBrowserResolver(VirtualFileSystem);
      var result = await resolver.resolve(null);
      assert.equal(result, undefined);
		});

    it('fetches the blob if given a url', async function () {
			mock.get('https://example.com/myimage1.png', {
				status: 200,
				body: myBlob
			});
      var resolver = new URLBrowserResolver(VirtualFileSystem);
      var result = await resolver.resolve('https://example.com/myimage1.png');
      assert.equal(result instanceof Blob, true);
		});

    it('fetches the blob if given a url object with headers', async function () {
			mock.get('https://example.com/myimage2.png', {
				status: 200,
				body: myBlob
			});
      var resolver = new URLBrowserResolver(VirtualFileSystem);
      var result = await resolver.resolve({ url: 'https://example.com/myimage2.png', headers: { Auth: '1234' }});
      assert.equal(result instanceof Blob, true);
		});

    it('fetches the blob if given a relative url', async function () {
			mock.get('/myimage3.png', {
				status: 200,
				body: myBlob
			});
      var resolver = new URLBrowserResolver(VirtualFileSystem);
      var result = await resolver.resolve('/myimage3.png');
      assert.equal(result instanceof Blob, true);
		});

	});
});
