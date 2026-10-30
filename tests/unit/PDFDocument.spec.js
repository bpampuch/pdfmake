'use strict';

var assert = require('assert');
var sinon = require('sinon');

var PDFDocument = require('../../js/PDFDocument').default;

describe('PDFDocument', function () {
	var pdfDocument;

	beforeEach(function () {
		var fontDefinitions = {
			Roboto: {
				normal: 'fonts/Roboto/Roboto-Regular.ttf',
				bold: 'fonts/Roboto/Roboto-Medium.ttf',
				italics: 'fonts/Roboto/Roboto-Italic.ttf',
				bolditalics: 'fonts/Roboto/Roboto-MediumItalic.ttf'
			}
		};
		pdfDocument = new PDFDocument(fontDefinitions);
	});

	describe('provideFont', function () {

		it('should load URL font definitions from each document virtual file system without changing them', function () {
			var source = { url: 'https://example.com/font.ttf', headers: { Authorization: 'Bearer token' } };
			var fonts = { Remote: { normal: source, bold: source, italics: source, bolditalics: source } };
			var data = require('fs').readFileSync('fonts/Roboto/Roboto-Regular.ttf');
			var original = JSON.parse(JSON.stringify(fonts));

			for (var i = 0; i < 2; i++) {
				var vfs = {
					existsSync: sinon.stub().withArgs(source.url).returns(true),
					readFileSync: sinon.stub().withArgs(source.url).returns(data)
				};
				var doc = new PDFDocument(fonts, {}, {}, {}, {}, vfs, () => false);
				[[false, false], [true, false], [false, true], [true, true]].forEach(function (style) {
					assert.equal(doc.provideFont('Remote', ...style).font.postscriptName, 'Roboto-Regular');
				});
				assert.equal(vfs.readFileSync.callCount, 4);
				assert.deepStrictEqual(fonts, original);
			}
		});

		it('should preserve collection definitions with and without headers', function () {
			var url = 'https://example.com/font.ttc';
			var source = { url: url, headers: { Authorization: 'Bearer token' } };
			var fonts = { Remote: { normal: [url, 'CollectionFont'], bold: [source, 'CollectionFont'] } };
			var data = Buffer.from('collection font data');
			var original = JSON.parse(JSON.stringify(fonts));

			for (var i = 0; i < 2; i++) {
				var vfs = {
					existsSync: filename => filename === url,
					readFileSync: sinon.stub().withArgs(url).returns(data)
				};
				var doc = new PDFDocument(fonts, {}, {}, {}, {}, vfs, () => false);
				var font = {};
				var loadFont = sinon.stub(doc, 'font').returns({ _font: font });

				assert.strictEqual(doc.provideFont('Remote', false, false), font);
				assert.strictEqual(doc.provideFont('Remote', true, false), font);
				assert.deepStrictEqual(loadFont.getCalls().map(call => call.args), [[data, 'CollectionFont'], [data, 'CollectionFont']]);
				assert.deepStrictEqual(fonts, original);
			}
		});

		it('throws error when given font not present', function () {
			assert.throws(function () {
				pdfDocument.provideFont('Arial', true, false);
			}, function (error) {
				assert.equal(error.message, `Font 'Arial' in style 'bold' is not defined in the font section of the document definition.`);
				return true;
			});
		});

		it('should provide normal Roboto font', function () {
			var result = pdfDocument.provideFont('Roboto', false, false);
			assert.equal(result.font.postscriptName, 'Roboto-Regular');
		});

		it('should provide bold Roboto font', function () {
			var result = pdfDocument.provideFont('Roboto', true, false);
			assert.equal(result.font.postscriptName, 'Roboto-Medium');
		});

		it('should provide italics Roboto font', function () {
			var result = pdfDocument.provideFont('Roboto', false, true);
			assert.equal(result.font.postscriptName, 'Roboto-Italic');
		});

		it('should provide bold and italics Roboto font', function () {
			var result = pdfDocument.provideFont('Roboto', true, true);
			assert.equal(result.font.postscriptName, 'Roboto-MediumItalic');
		});

	});

	describe('provideImage', function () {
		var imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAQMAAADNIO3CAAAAA1BMVEUAAN7GEcIJAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB98DBREbA3IZ3d8AAAALSURBVAjXY2BABwAAEgAB74lUpAAAAABJRU5ErkJggg==';

		it('should decode and embed an image from a named data URL', function () {
			pdfDocument.images = { logo: imageData };
			var image = pdfDocument.provideImage('logo');
			assert.equal(image.width, 12);
			assert.equal(image.height, 6);
			assert(image.obj, 'The image should be embedded as a PDF object');
			assert.strictEqual(pdfDocument._imageRegistry.logo, image);
		});

		it('should reuse a cached image without opening or embedding it again', function () {
			pdfDocument.images = { logo: imageData };
			var first = pdfDocument.provideImage('logo');
			var openImage = sinon.spy(pdfDocument, 'openImage');
			var embed = sinon.spy(first, 'embed');
			assert.strictEqual(pdfDocument.provideImage('logo'), first);
			sinon.assert.notCalled(openImage);
			sinon.assert.notCalled(embed);
		});

		it('should read named images from the virtual file system', function () {
			pdfDocument.images = { logo: 'logo.png' };
			pdfDocument.virtualfs = {
				existsSync: filename => filename === 'logo.png',
				readFileSync: function (filename) {
					assert.equal(filename, 'logo.png');
					return Buffer.from(imageData.split(',')[1], 'base64');
				}
			};
			pdfDocument.localAccessPolicy = () => false;
			var image = pdfDocument.provideImage('logo');
			assert.equal(image.width, 12);
			assert.equal(image.height, 6);
		});

		it('should accept image buffers without accessing the file system', function () {
			pdfDocument.localAccessPolicy = () => false;
			var image = pdfDocument.provideImage(Buffer.from(imageData.split(',')[1], 'base64'));
			assert.equal(image.width, 12);
			assert.equal(image.height, 6);
		});

		it('should load URL image definitions from each document virtual file system without changing them', function () {
			var source = { url: 'https://example.com/image.png', headers: { Authorization: 'Bearer token' } };
			var images = { logo: source };
			var original = JSON.parse(JSON.stringify(images));
			var data = Buffer.from(imageData.split(',')[1], 'base64');

			for (var i = 0; i < 2; i++) {
				var vfs = {
					existsSync: sinon.stub().withArgs(source.url).returns(true),
					readFileSync: sinon.stub().withArgs(source.url).returns(data)
				};
				var doc = new PDFDocument({}, images, {}, {}, {}, vfs, () => false);
				var image = doc.provideImage('logo');
				assert.equal(image.width, 12);
				assert.equal(image.height, 6);
				sinon.assert.calledOnceWithExactly(vfs.readFileSync, source.url);
				assert.deepStrictEqual(images, original);
			}
		});

		it('should decode data URLs in image definitions with headers', function () {
			pdfDocument.images = { logo: { url: imageData, headers: {} } };
			var image = pdfDocument.provideImage('logo');
			assert.equal(image.width, 12);
			assert.equal(image.height, 6);
		});

		it('should enforce the local access policy for image definitions with headers', function () {
			pdfDocument.images = { logo: { url: 'private.png', headers: {} } };
			pdfDocument.localAccessPolicy = () => false;
			var openImage = sinon.spy(pdfDocument, 'openImage');
			assert.throws(() => pdfDocument.provideImage('logo'), /Access to local file denied.*private\.png/);
			sinon.assert.notCalled(openImage);
		});

		it('should resolve named local image paths before opening them', function () {
			pdfDocument.images = { logo: 'logo.png' };
			var image = { embed: sinon.spy() };
			var openImage = sinon.stub(pdfDocument, 'openImage').returns(image);
			assert.strictEqual(pdfDocument.provideImage('logo'), image);
			sinon.assert.calledOnceWithExactly(openImage, 'logo.png');
			sinon.assert.calledOnceWithExactly(image.embed, pdfDocument);
		});

		it('should reject local image paths denied by the access policy before opening them', function () {
			pdfDocument.images = { logo: 'private.png' };
			pdfDocument.localAccessPolicy = () => false;
			var openImage = sinon.spy(pdfDocument, 'openImage');
			assert.throws(() => pdfDocument.provideImage('logo'), /Access to local file denied.*private\.png/);
			sinon.assert.notCalled(openImage);
		});

		it('should report invalid image data without caching it', function () {
			assert.throws(() => pdfDocument.provideImage(Buffer.from('invalid image')), /Invalid image:.*Unknown image format/);
			assert.equal(Object.keys(pdfDocument._imageRegistry).length, 0);
		});

		it('should report an image loader returning no image', function () {
			sinon.stub(pdfDocument, 'openImage').returns(null);
			assert.throws(() => pdfDocument.provideImage('missing.png'), /Invalid image: Error: No image/);
			assert.equal(pdfDocument._imageRegistry['missing.png'], undefined);
		});
	});

	describe('provideAttachment', function () {

		it('should preserve URL attachment definitions when loading by name or inline', function () {
			var source = { url: 'https://example.com/report.txt', headers: { Authorization: 'Bearer token' } };
			var attachment = { src: source, name: 'report.txt', description: 'Report description' };
			var attachments = { report: attachment };
			var original = JSON.parse(JSON.stringify(attachments));
			var content = Buffer.from('Attachment contents');

			for (var i = 0; i < 2; i++) {
				var vfs = {
					existsSync: sinon.stub().withArgs(source.url).returns(true),
					readFileSync: sinon.stub().withArgs(source.url).returns(content)
				};
				var doc = new PDFDocument({}, {}, {}, attachments, {}, vfs, () => false);
				assert.deepStrictEqual(doc.provideAttachment('report'), { ...attachment, src: content });
				assert.deepStrictEqual(doc.provideAttachment(attachment), { ...attachment, src: content });
				assert.equal(vfs.readFileSync.callCount, 2);
				assert.deepStrictEqual(attachments, original);
			}
		});

		it('should resolve attachment sources with headers without a virtual file system', function () {
			var attachment = { src: { url: 'report.txt', headers: {} }, name: 'report.txt' };
			pdfDocument.localAccessPolicy = filename => filename === 'report.txt';
			assert.deepStrictEqual(pdfDocument.provideAttachment(attachment), { src: 'report.txt', name: 'report.txt' });
			assert.deepStrictEqual(attachment.src, { url: 'report.txt', headers: {} });
		});

		it('should enforce the local access policy for attachment sources with headers', function () {
			pdfDocument.localAccessPolicy = () => false;
			assert.throws(() => pdfDocument.provideAttachment({ src: { url: 'private.txt', headers: {} } }), /Access to local file denied.*private\.txt/);
		});

		it('should resolve a named VFS attachment without changing its metadata or original definition', function () {
			var content = Buffer.from('Attachment contents');
			var attachment = { src: 'report.txt', name: 'report.txt', description: 'Report description' };
			pdfDocument.attachments = { report: attachment };
			pdfDocument.virtualfs = {
				existsSync: filename => filename === 'report.txt',
				readFileSync: () => content
			};

			assert.deepStrictEqual(pdfDocument.provideAttachment('report'), { ...attachment, src: content });
			assert.strictEqual(attachment.src, 'report.txt');
		});

		it('should resolve an inline VFS attachment without changing its metadata or original definition', function () {
			var content = Buffer.from('Attachment contents');
			var attachment = { src: 'report.txt', name: 'report.txt', description: 'Report description' };
			pdfDocument.virtualfs = {
				existsSync: filename => filename === 'report.txt',
				readFileSync: () => content
			};

			assert.deepStrictEqual(pdfDocument.provideAttachment(attachment), { ...attachment, src: content });
			assert.strictEqual(attachment.src, 'report.txt');
		});

		it('should enforce the local access policy for inline attachments', function () {
			pdfDocument.localAccessPolicy = () => false;

			assert.throws(() => pdfDocument.provideAttachment({ src: 'report.txt' }), /Access to local file denied/);
		});

	});

	describe('resolveColor', function () {

		it('should resolve valid color name', function () {
			assert.equal(pdfDocument.resolveColor('red'), 'red');
		});

		it('should resolve default color', function () {
			assert.equal(pdfDocument.resolveColor(undefined, 'red'), 'red');
		});

		it('should resolve hex color', function () {
			 assert.equal(pdfDocument.resolveColor('#f900f8'), '#f900f8');
		});

		it('should resolve invalid color name', function () {
			assert.equal(pdfDocument.resolveColor('invalid'), null);
		});

		it('should resolve invalid color name with default', function () {
			assert.equal(pdfDocument.resolveColor('invalid', 'red'), 'red');
		});

	});

});
