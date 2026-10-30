'use strict';

var assert = require('assert');
var sinon = require('sinon');

var PDFDocument = require('../../js/PDFDocument').default;
var Printer = require('../../js/Printer').default;
var virtualfs = require('../../js/virtual-fs').default;
var URLResolver = require('../../js/URLResolver').default;
var embedFiles = require('rewire')('../../js/Printer').__get__('embedFiles');

describe('Printer', function () {

	var SHORT_SIDE = 1000, LONG_SIDE = 2000;
	var fontDescriptors, printer;

	beforeEach(function () {
		fontDescriptors = {
			Roboto: {
				normal: 'fonts/Roboto/Roboto-Regular.ttf'
			}
		};
		PDFDocument.prototype.addPage = sinon.spy(PDFDocument.prototype.addPage);

	});

	describe('resolveUrls', function () {
		it('should preserve resource URLs and headers on repeated resolution', async function () {
			var source = { url: 'https://example.com/resource', headers: { Authorization: 'Bearer token' } };
			var plain = 'https://example.com/plain';
			var fonts = { Remote: {}, Collection: {} };
			['normal', 'bold', 'italics', 'bolditalics'].forEach(function (style) {
				fonts.Remote[style] = source;
				fonts.Collection[style] = [source, 'CollectionFont'];
			});
			var docDefinition = {
				images: { logo: source, plain: plain },
				attachments: { report: { src: source }, plain: { src: plain } },
				files: { report: { src: source }, plain: { src: plain } }
			};
			var original = JSON.parse(JSON.stringify({ fonts: fonts, doc: docDefinition }));
			var resolver = { resolve: sinon.spy(), resolved: sinon.stub().resolves() };
			printer = new Printer(fonts, virtualfs, resolver);
			var expected = Array(8).fill([source.url, source.headers]).concat([
				[source.url, source.headers], [plain, {}],
				[source.url, source.headers], [plain, {}],
				[source.url, source.headers], [plain, {}]
			]);

			await printer.resolveUrls(docDefinition);
			await printer.resolveUrls(docDefinition);

			assert.deepStrictEqual({ fonts: fonts, doc: docDefinition }, original);
			assert.deepStrictEqual(resolver.resolve.getCalls().map(call => call.args), expected.concat(expected));
		});
	});

	describe('embedFiles', function () {
		it('should preserve file definitions when embedding from each document virtual file system', function () {
			var url = 'https://example.com/report.txt';
			var source = { url: url, headers: { Authorization: 'Bearer token' } };
			var docDefinition = {
				files: {
					report: { src: source, description: 'Report description' },
					named: { src: url, name: 'custom.txt' }
				}
			};
			var original = JSON.parse(JSON.stringify(docDefinition));
			var content = Buffer.from('File contents');

			for (var i = 0; i < 2; i++) {
				var doc = {
					virtualfs: {
						existsSync: filename => filename === url,
						readFileSync: sinon.stub().withArgs(url).returns(content)
					},
					file: sinon.spy()
				};
				embedFiles(docDefinition, doc);
				assert.deepStrictEqual(doc.file.firstCall.args, [content, { src: content, description: 'Report description', name: 'report' }]);
				assert.deepStrictEqual(doc.file.secondCall.args, [content, { src: content, name: 'custom.txt' }]);
				assert.equal(doc.virtualfs.readFileSync.callCount, 2);
				assert.deepStrictEqual(docDefinition, original);
			}
		});

		it('should resolve file sources with headers without a virtual file system', function () {
			var source = { url: 'report.txt', headers: {} };
			var docDefinition = { files: { report: { src: source } } };
			var doc = { file: sinon.spy() };
			embedFiles(docDefinition, doc);
			sinon.assert.calledOnceWithExactly(doc.file, 'report.txt', { src: 'report.txt', name: 'report' });
			assert.deepStrictEqual(docDefinition.files.report, { src: source });
		});

		it('should enforce the local access policy for file sources with headers', function () {
			var doc = new PDFDocument({}, {}, {}, {}, {}, null, () => false);
			assert.throws(() => embedFiles({ files: { report: { src: { url: 'private.txt', headers: {} } } } }, doc), /Access to local file denied.*private\.txt/);
		});
	});

	it('should pass switched width and height to pdfkit if page orientation changes from default portrait to landscape', async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));
		var docDefinition = {
			pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
			content: [
				{
					text: 'Page 1'
				},
				{
					text: 'Page 2',
					pageBreak: 'before',
					pageOrientation: 'landscape'
				}
			]
		};
		await printer.createPdfKitDocument(docDefinition);

		assert(PDFDocument.prototype.addPage.callCount === 2);

		assert.deepEqual(PDFDocument.prototype.addPage.firstCall.args[0].size, [SHORT_SIDE, LONG_SIDE]);
		assert.deepEqual(PDFDocument.prototype.addPage.secondCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
	});

	it('should pass switched width and height to pdfkit if page orientation changes from portrait to landscape', async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));
		var docDefinition = {
			pageOrientation: 'portrait',
			pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
			content: [
				{
					text: 'Page 1'
				},
				{
					text: 'Page 2',
					pageBreak: 'before',
					pageOrientation: 'landscape'
				}
			]
		};
		await printer.createPdfKitDocument(docDefinition);

		assert(PDFDocument.prototype.addPage.callCount === 2);

		assert.deepEqual(PDFDocument.prototype.addPage.firstCall.args[0].size, [SHORT_SIDE, LONG_SIDE]);
		assert.deepEqual(PDFDocument.prototype.addPage.secondCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
	});

	it('should pass switched width and height to pdfkit if page orientation changes from landscape to portrait', async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));

		var docDefinition = {
			pageOrientation: 'landscape',
			pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
			content: [
				{
					text: 'Page 1'
				},
				{
					text: 'Page 2',
					pageBreak: 'before',
					pageOrientation: 'portrait'
				},
				{
					text: 'Page 3 still portrait',
					pageBreak: 'before'
				}
			]
		};
		await printer.createPdfKitDocument(docDefinition);

		assert(PDFDocument.prototype.addPage.callCount === 3);

		assert.deepEqual(PDFDocument.prototype.addPage.firstCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
		assert.deepEqual(PDFDocument.prototype.addPage.secondCall.args[0].size, [SHORT_SIDE, LONG_SIDE]);
		assert.deepEqual(PDFDocument.prototype.addPage.thirdCall.args[0].size, [SHORT_SIDE, LONG_SIDE]);
	});


	it('should not switch width and height for pdfkit if page orientation changes from landscape to landscape', async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));
		var docDefinition = {
			pageOrientation: 'portrait',
			pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
			content: [
				{
					text: 'Page 1'
				},
				{
					text: 'Page 2',
					pageBreak: 'before',
					pageOrientation: 'landscape'
				},
				{
					text: 'Page 3 landscape again',
					pageOrientation: 'landscape',
					pageBreak: 'after'
				}
			]
		};
		await printer.createPdfKitDocument(docDefinition);

		assert.equal(PDFDocument.prototype.addPage.callCount, 3);


		assert.deepEqual(PDFDocument.prototype.addPage.firstCall.args[0].size, [SHORT_SIDE, LONG_SIDE]);
		assert.deepEqual(PDFDocument.prototype.addPage.secondCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
		assert.deepEqual(PDFDocument.prototype.addPage.thirdCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
	});

	it('should print bullet vectors as ellipses', async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));
		var docDefinition = {
			pageOrientation: 'portrait',
			pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
			content: [
				{
					"stack": [
						{
							"ul": [
								{ "text": "item1" },
								{ "text": "item2" }
							]
						}
					]
				}
			]
		};
		PDFDocument.prototype.ellipse = sinon.spy(PDFDocument.prototype.ellipse);

		await printer.createPdfKitDocument(docDefinition);

		function assertEllipse(ellipseCallArgs) {
			var firstEllipse = {
				x: ellipseCallArgs[0],
				y: ellipseCallArgs[1],
				r1: ellipseCallArgs[2],
				r2: ellipseCallArgs[3]
			};
			assert(firstEllipse.x !== undefined);
			assert(!isNaN(firstEllipse.x));
			assert(firstEllipse.y !== undefined);
			assert(!isNaN(firstEllipse.y));
			assert(firstEllipse.r1 !== undefined);
			assert(!isNaN(firstEllipse.r1));
			assert(firstEllipse.r2 !== undefined);
			assert(!isNaN(firstEllipse.r2));
		}

		assert.equal(PDFDocument.prototype.ellipse.callCount, 2);

		assertEllipse(PDFDocument.prototype.ellipse.firstCall.args);
		assertEllipse(PDFDocument.prototype.ellipse.secondCall.args);

	});

	it('should calculate automatic height independently for each section', async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));
		var docDefinition = {
			pageSize: { width: 300, height: 'auto' },
			pageMargins: 40,
			content: [
				{ section: [{ canvas: [{ type: 'rect', x: 0, y: 0, w: 100, h: 30 }] }] },
				{ section: [{ canvas: [{ type: 'rect', x: 0, y: 0, w: 100, h: 150 }] }] }
			]
		};

		await printer.createPdfKitDocument(docDefinition);

		assert.equal(PDFDocument.prototype.addPage.callCount, 2);
		assert.deepEqual(PDFDocument.prototype.addPage.firstCall.args[0].size, [300, 110]);
		assert.deepEqual(PDFDocument.prototype.addPage.secondCall.args[0].size, [300, 230]);
	});

	it('should print only the require number of pages', async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));

		var docDefinition = {
			pageSize: 'A4',
			maxPagesNumber: 1,
			content: [
				{
					text: 'Page 1'
				},
				{
					text: 'Page 2',
					pageBreak: 'before',
					pageOrientation: 'landscape'
				}]
		};

		await printer.createPdfKitDocument(docDefinition);

		assert(PDFDocument.prototype.addPage.callCount === 1);
	});

	it('should print all pages when maxPagesNumber is undefined', async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));

		var docDefinition = {
			pageSize: 'A4',
			content: [
				{
					text: 'Page 1'
				},
				{
					text: 'Page 2',
					pageBreak: 'before',
					pageOrientation: 'landscape'
				},
				{
					text: 'Page 3',
					pageBreak: 'before',
				}]
		};

		await printer.createPdfKitDocument(docDefinition);

		assert(PDFDocument.prototype.addPage.callCount === 3);
	});

	it('should report progress on each rendered item when a progressCallback is passed', async function () {

		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));

		var progressCallback = sinon.spy(function () { });

		var docDefinition = {
			pageSize: 'A4',
			content: [
				{
					text: 'Text item 1'
				},
				{
					image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAQMAAADNIO3CAAAAA1BMVEUAAN7GEcIJAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB98DBREbA3IZ3d8AAAALSURBVAjXY2BABwAAEgAB74lUpAAAAABJRU5ErkJggg=='
				},
				{
					text: 'Text item 2'
				},
				{
					canvas: [{
						type: 'rect',
						x: 0,
						y: 0,
						w: 310,
						h: 260
					}]
				}]
		};

		await printer.createPdfKitDocument(docDefinition, { progressCallback: progressCallback });

		assert(progressCallback.withArgs(0.25).calledOnce);
		assert(progressCallback.withArgs(0.5).calledOnce);
		assert(progressCallback.withArgs(0.75).calledOnce);
		assert(progressCallback.withArgs(1).calledOnce);
	});

	it('should work without a progressCallback', async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));

		var docDefinition = {
			pageSize: 'A4',
			content: [{ text: 'Text item 1' }]
		};

		assert.doesNotThrow(async function () {
			await printer.createPdfKitDocument(docDefinition);
		});
	});

});
