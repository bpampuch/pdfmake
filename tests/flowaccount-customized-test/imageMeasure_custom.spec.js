'use strict';

var assert = require('assert');

var ImageMeasure = require('../../src/imageMeasure');

describe('FlowAccount ImageMeasure enhancements', function () {
	function createFakeImage(width, height, orientation) {
		var embedded = false;
		return {
			width: width,
			height: height,
			orientation: orientation || 1,
			embed: function (doc) {
				doc._embedded = true;
				embedded = true;
			},
			isEmbedded: function () { return embedded; }
		};
	}

	function createPdfDoc(fakeImage, capture) {
		return {
			_imageRegistry: {},
			_embedded: false,
			openImageCount: 0,
			openImage: function (src) {
				this.openImageCount += 1;
				if (capture) {
					capture.value = src;
				}
				return fakeImage;
			}
		};
	}

	it('swaps width and height when EXIF orientation demands rotation', function () {
		var fakeImage = createFakeImage(100, 200, 6);
		var pdfDoc = createPdfDoc(fakeImage);
		var measure = new ImageMeasure(pdfDoc, {});

		var size = measure.measureImage('photo');

		assert.strictEqual(size.width, 200, 'width swapped with height');
		assert.strictEqual(size.height, 100, 'height swapped with width');
		assert.strictEqual(pdfDoc._imageRegistry.photo, fakeImage, 'image cached in registry');
		assert.ok(fakeImage.isEmbedded(), 'image embedded into pdfKit doc');
	});

	it('reuses cached registry entries without re-opening image', function () {
		var fakeImage = createFakeImage(80, 40, 1);
		var pdfDoc = createPdfDoc(fakeImage);
		var measure = new ImageMeasure(pdfDoc, {});

		measure.measureImage('logo');
		measure.measureImage('logo');

		assert.strictEqual(pdfDoc.openImageCount, 1, 'openImage invoked only once');
	});

	it('converts Uint8Array sources to Buffer before opening', function () {
		var fakeImage = createFakeImage(60, 30, 1);
		var captured = { value: null };
		var pdfDoc = createPdfDoc(fakeImage, captured);
		var bytes = new Uint8Array([1, 2, 3, 4]);
		var measure = new ImageMeasure(pdfDoc, { remote: bytes });

		measure.measureImage('remote');

		assert.ok(Buffer.isBuffer(captured.value), 'Uint8Array converted to Buffer');
		assert.strictEqual(captured.value.length, bytes.length, 'buffer retains original length');
	});
});
