'use strict';

var assert = require('assert');
var sinon = require('sinon');

var integrationTestHelper = require('./integrationTestHelper');
var Renderer = require('../../js/Renderer').default;

describe('Integration Test: images', function () {

	var testHelper = new integrationTestHelper();

	var INLINE_TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAQMAAADNIO3CAAAAA1BMVEUAAN7GEcIJAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB98DBREbA3IZ3d8AAAALSURBVAjXY2BABwAAEgAB74lUpAAAAABJRU5ErkJggg==';

	describe('binary image rendering', function () {
		function renderPdf(helper, pages) {
			var doc = helper.pdfDocument;
			var chunks = [];
			var result = new Promise((resolve, reject) => {
				doc.on('data', chunk => chunks.push(chunk));
				doc.on('end', () => resolve(Buffer.concat(chunks).toString('latin1')));
				doc.on('error', reject);
			});
			new Renderer(doc).renderPages(pages);
			doc.end();
			return result;
		}

		['png', 'jpeg'].forEach(function (format) {
			['Buffer', 'Uint8Array', 'ArrayBuffer'].forEach(function (type) {
				[false, true].forEach(function (cover) {
					it('reuses ' + format + ' ' + type + ' images across sources and pages, cover=' + cover, async function () {
						var data = format === 'png' ? Buffer.from(INLINE_TEST_IMAGE.split(',')[1], 'base64') : require('fs').readFileSync('examples/images/sampleImage.jpg');
						var dataUrl = 'data:image/' + format + ';base64,' + data.toString('base64');
						function source() {
							if (type === 'Buffer') return Buffer.from(data);
							if (type === 'Uint8Array') return Uint8Array.from(data);
							return Uint8Array.from(data).buffer;
						}
						function image(src, width) {
							return cover ? { image: src, cover: { width: width, height: width * 0.6, align: 'right', valign: 'bottom' } } : { image: src, width: width };
						}
						var shared = source();
						var content = [image(shared, 20), image(shared, 40), image(source(), 30), image('logo', 20), image(dataUrl, 20),
							{ svg: '<svg width="20" height="10"><image href="' + dataUrl + '" width="20" height="10"/></svg>' }];
						content[1].pageBreak = 'before';
						content[0].link = 'https://example.com/';
						var helper = new integrationTestHelper();
						var pages = helper.renderPages('A6', { images: { logo: source() }, content: content });
						var pdf = await renderPdf(helper, pages);

						assert.equal(pages.length, 2);
						assert.equal((pdf.match(/\/Subtype \/Image\b/g) || []).length, 1);
						assert.equal((pdf.match(/\/I1 Do\b/g) || []).length, 6);
						assert.equal((pdf.match(/\/Subtype \/Link\b/g) || []).length, 1);
						assert.strictEqual(content[0].image, shared);
						assert.strictEqual(content[1].image, shared);
					});
				});
			});
		});

	});

	describe('basics', function () {
		it('hashes repeated inline base64 images only once across content, headers and footers', function () {
			var hash = sinon.spy(require('@noble/hashes/sha2.js'), 'sha256');
			var dd = {
				content: [
					{ image: INLINE_TEST_IMAGE, width: 20 },
					{ image: INLINE_TEST_IMAGE, width: 40, pageBreak: 'before' }
				],
				header: () => ({ image: INLINE_TEST_IMAGE, width: 10 }),
				footer: () => ({ image: INLINE_TEST_IMAGE, width: 10 })
			};
			try {
				var pages = testHelper.renderPages('A6', dd);
				assert.equal(pages.length, 2);
				assert.deepStrictEqual(dd.images, {});
				pages.forEach(function (page) {
					var images = page.items.filter(item => item.type === 'image');
					assert.equal(images.length, 3);
					images.forEach(item => assert.equal(item.item.image, INLINE_TEST_IMAGE));
				});
				new Renderer(testHelper.pdfDocument).renderPages(pages);
				sinon.assert.calledOnce(hash);
			} finally {
				hash.restore();
			}
		});

		['data:image/png;base64,aW52YWxpZA==', 'missing-svg-image.png'].forEach(function (src) {
			it('throws for an invalid SVG image: ' + src, function () {
				var pages = testHelper.renderPages('A6', {
					content: [{ svg: '<svg width="12" height="6"><image href="' + src + '" width="12" height="6"/></svg>' }]
				});
				assert.throws(() => new Renderer(testHelper.pdfDocument).renderPages(pages), /Invalid image:/);
			});
		});

		it('resolves named and VFS images in SVG before opening them from the registry', function () {
			var pages = testHelper.renderPages('A6', {
				images: { logo: INLINE_TEST_IMAGE },
				content: [{ svg: '<svg width="24" height="6"><image href="logo" width="12" height="6"/><image href="virtual.png" x="12" width="12" height="6"/></svg>' }]
			});
			var doc = testHelper.pdfDocument;
			var VirtualFileSystem = require('../../js/virtual-fs').VirtualFileSystem;
			doc.virtualfs = new VirtualFileSystem();
			doc.virtualfs.writeFileSync('virtual.png', Buffer.from(INLINE_TEST_IMAGE.split(',')[1], 'base64'));
			doc.localAccessPolicy = () => false;
			new Renderer(doc).renderPages(pages);
			assert.strictEqual(doc._imageRegistry.logo, doc._imageRegistry['virtual.png']);
			assert.strictEqual(doc.page.xobjects[doc._imageRegistry.logo.label], doc._imageRegistry.logo.obj);
		});

		it('embeds identical inline, named and SVG images only once across pages', async function () {
			var pages = testHelper.renderPages('A6', {
				images: { logo: INLINE_TEST_IMAGE, copy: Buffer.from(INLINE_TEST_IMAGE.split(',')[1], 'base64') },
				content: [
					{ image: INLINE_TEST_IMAGE, width: 20 },
					{ image: INLINE_TEST_IMAGE, width: 40 },
					{ image: 'logo', width: 30, pageBreak: 'before' },
					{ image: 'copy', width: 10 },
					{ svg: '<svg width="12" height="6"><image href="' + INLINE_TEST_IMAGE + '" width="12" height="6"/></svg>' }
				]
			});
			assert.equal(pages.length, 2);
			var doc = testHelper.pdfDocument;
			var chunks = [];
			var result = new Promise((resolve, reject) => {
				doc.on('data', chunk => chunks.push(chunk));
				doc.on('end', () => resolve(Buffer.concat(chunks).toString('latin1')));
				doc.on('error', reject);
			});
			new Renderer(doc).renderPages(pages);
			doc.end();
			var pdf = await result;
			assert.equal((pdf.match(/\/Subtype \/Image\b/g) || []).length, 1);
			assert.equal((pdf.match(/\/I1 Do/g) || []).length, 5);
		});

		it('renders next element below image', function () {
			var imageHeight = 150;
			var dd = {
				content: [
					{
						image: INLINE_TEST_IMAGE,
						height: imageHeight
					},
					'some Text'
				]
			};

			var pages = testHelper.renderPages('A6', dd);

			assert.equal(pages.length, 1);

			var image = pages[0].items[0].item;
			var someElementAfterImage = pages[0].items[1].item;

			assert.equal(image.x, testHelper.MARGINS.left);
			assert.equal(image.y, testHelper.MARGINS.top);
			assert.equal(someElementAfterImage.x, testHelper.MARGINS.left);
			assert.equal(someElementAfterImage.y, testHelper.MARGINS.top + imageHeight);
		});

		it('renders image below text', function () {
			var imageHeight = 150;
			var dd = {
				content: [
					'some Text',
					{
						image: INLINE_TEST_IMAGE,
						height: imageHeight
					}
				]
			};

			var pages = testHelper.renderPages('A6', dd);

			assert.equal(pages.length, 1);

			var someElementBeforeImage = pages[0].items[0].item;
			var image = pages[0].items[1].item;


			assert.equal(someElementBeforeImage.x, testHelper.MARGINS.left);
			assert.equal(someElementBeforeImage.y, testHelper.MARGINS.top);

			assert.equal(image.x, testHelper.MARGINS.left);
			assert.equal(image.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT);
		});
	});

});
