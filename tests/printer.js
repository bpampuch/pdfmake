'use strict';

var assert = require('assert');
var sinon = require('sinon');
var http = require('http');

var PdfKit = require('@foliojs-fork/pdfkit'); // Use same PdfKit that printer.js uses
var Printer = require('../src/printer.js');

describe('Printer', function () {

	var SHORT_SIDE = 1000, LONG_SIDE = 2000;
	var fontDescriptors, printer;
	var sandbox;

	beforeEach(function () {
		sandbox = sinon.createSandbox();
		fontDescriptors = {
			Roboto: {
				normal: 'tests/fonts/Roboto-Regular.ttf'
			}
		};
		sandbox.spy(PdfKit.prototype, 'addPage');
	});

	afterEach(function () {
		sandbox.restore();
	});

		describe('remote images', function () {
			var server;
			var serverUrl;
			var requestCount;
			var imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAQMAAADNIO3CAAAAA1BMVEUAAN7GEcIJAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB98DBREbA3IZ3d8AAAALSURBVAjXY2BABwAAEgAB74lUpAAAAABJRU5ErkJggg==', 'base64');

			function startServer() {
				requestCount = 0;
				return new Promise(function (resolve) {
					server = http.createServer(function (req, res) {
						requestCount++;
						res.writeHead(200, { 'Content-Type': 'image/png' });
						res.end(imageBuffer);
					});
					server.listen(0, '127.0.0.1', function () {
						var address = server.address();
						serverUrl = 'http://' + address.address + ':' + address.port + '/image.png';
						resolve();
					});
				});
			}

			function stopServer() {
				if (!server) {
					return Promise.resolve();
				}

				return new Promise(function (resolve) {
					server.close(function () {
						server = null;
						resolve();
					});
				});
			}

			afterEach(function () {
				return stopServer();
			});

			it('downloads remote images via resolveRemoteImages and caches result', async function () {
				await startServer();
				printer = new Printer(fontDescriptors);

				var docDefinitionA = {
					content: [{ image: serverUrl, width: 80 }],
					images: {}
				};

				await printer.resolveRemoteImages(docDefinitionA);
				assert(Buffer.isBuffer(docDefinitionA.images[serverUrl]));
				assert.strictEqual(docDefinitionA.images[serverUrl].equals(imageBuffer), true);
				assert.strictEqual(requestCount, 1);

				var docDefinitionB = {
					content: [{ image: serverUrl, width: 40 }],
					images: {}
				};

				await printer.resolveRemoteImages(docDefinitionB);
				assert(Buffer.isBuffer(docDefinitionB.images[serverUrl]));
				assert.strictEqual(docDefinitionB.images[serverUrl].equals(imageBuffer), true);
				assert.strictEqual(requestCount, 1, 'remote image should be served from cache on second doc');

				var pdfDoc = printer.createPdfKitDocument(docDefinitionB);
				pdfDoc.end();
			});

			it('createPdfKitDocumentAsync resolves remote images automatically', async function () {
				await startServer();
				printer = new Printer(fontDescriptors);

				var docDefinition = {
					content: [{ image: serverUrl, width: 50 }]
				};

				var pdfDoc = await printer.createPdfKitDocumentAsync(docDefinition, { remoteImageTimeout: 2000 });
				assert(Buffer.isBuffer(docDefinition.images[serverUrl]));
				assert.strictEqual(requestCount, 1);
				pdfDoc.end();
			});
		});

	it('should pass switched width and height to pdfkit if page orientation changes from default portrait to landscape', function () {
		printer = new Printer(fontDescriptors);
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
		printer.createPdfKitDocument(docDefinition);

		assert(PdfKit.prototype.addPage.callCount === 2);

		assert.equal(PdfKit.prototype.addPage.firstCall.args[0], undefined);
		assert.deepEqual(PdfKit.prototype.addPage.secondCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
	});

	it('should pass switched width and height to pdfkit if page orientation changes from portrait to landscape', function () {
		printer = new Printer(fontDescriptors);
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
		printer.createPdfKitDocument(docDefinition);

		assert(PdfKit.prototype.addPage.callCount === 2);

		assert.equal(PdfKit.prototype.addPage.firstCall.args[0], undefined);
		assert.deepEqual(PdfKit.prototype.addPage.secondCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
	});

	it('should pass switched width and height to pdfkit if page orientation changes from landscape to portrait', function () {
		printer = new Printer(fontDescriptors);

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
		printer.createPdfKitDocument(docDefinition);

		assert(PdfKit.prototype.addPage.callCount === 3);

		assert.equal(PdfKit.prototype.addPage.firstCall.args[0], undefined);
		assert.deepEqual(PdfKit.prototype.addPage.secondCall.args[0].size, [SHORT_SIDE, LONG_SIDE]);
		assert.deepEqual(PdfKit.prototype.addPage.thirdCall.args[0].size, [SHORT_SIDE, LONG_SIDE]);
	});


	it('should not switch width and height for pdfkit if page orientation changes from landscape to landscape', function () {
		printer = new Printer(fontDescriptors);
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
		printer.createPdfKitDocument(docDefinition);

		assert.equal(PdfKit.prototype.addPage.callCount, 3);


		assert.equal(PdfKit.prototype.addPage.firstCall.args[0], undefined);
		assert.deepEqual(PdfKit.prototype.addPage.secondCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
		assert.deepEqual(PdfKit.prototype.addPage.thirdCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
	});

	it('should print bullet vectors as ellipses', function () {
		printer = new Printer(fontDescriptors);
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
		sandbox.spy(PdfKit.prototype, 'ellipse');

		printer.createPdfKitDocument(docDefinition);

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

		assert.equal(PdfKit.prototype.ellipse.callCount, 2);

		assertEllipse(PdfKit.prototype.ellipse.firstCall.args);
		assertEllipse(PdfKit.prototype.ellipse.secondCall.args);

	});

	it('should print only the require number of pages', function () {
		printer = new Printer(fontDescriptors);

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

		printer.createPdfKitDocument(docDefinition);

		assert(PdfKit.prototype.addPage.callCount === 1);
	});

	it('should print all pages when maxPagesNumber is undefined', function () {
		printer = new Printer(fontDescriptors);

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

		printer.createPdfKitDocument(docDefinition);

		assert(PdfKit.prototype.addPage.callCount === 3);
	});

	it('should report progress on each rendered item when a progressCallback is passed', function () {

		printer = new Printer(fontDescriptors);

		var progressCallback = sinon.spy(function (progress) { });

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

		printer.createPdfKitDocument(docDefinition, { progressCallback: progressCallback });

		assert(progressCallback.withArgs(0.25).calledOnce);
		assert(progressCallback.withArgs(0.5).calledOnce);
		assert(progressCallback.withArgs(0.75).calledOnce);
		assert(progressCallback.withArgs(1).calledOnce);
	});

	it('should work without a progressCallback', function () {
		printer = new Printer(fontDescriptors);

		var docDefinition = {
			pageSize: 'A4',
			content: [{ text: 'Text item 1' }]
		};

		assert.doesNotThrow(function () {
			printer.createPdfKitDocument(docDefinition);
		});
	});

});
