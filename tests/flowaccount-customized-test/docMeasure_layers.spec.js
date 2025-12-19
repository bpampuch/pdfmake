'use strict';

var assert = require('assert');

var DocPreprocessor = require('../../src/docPreprocessor');
var DocMeasure = require('../../src/docMeasure');

var sampleTestProvider = {
	provideFont: function () {
		return {
			widthOfString: function (text, size) {
				return text.length * size;
			},
			lineHeight: function (size) {
				return size;
			}
		};
	}
};

describe('FlowAccount DocMeasure layers support', function () {
	var docPreprocessor;
	var docMeasure;

	beforeEach(function () {
		docPreprocessor = new DocPreprocessor();
		docMeasure = new DocMeasure(sampleTestProvider);
	});

	function preprocessLayers(node) {
		return docPreprocessor.preprocessLayers(node);
	}

	it('computes layer min/max widths from child content', function () {
		var node = { layers: ['tiny', 'thisislonger'] };

		preprocessLayers(node);
		docMeasure.measureLayers(node);

		var firstLayerWidth = node.layers[0]._minWidth;
		var secondLayerWidth = node.layers[1]._minWidth;

		assert.strictEqual(firstLayerWidth, 4 * 12, 'first layer min width uses longest word');
		assert.strictEqual(secondLayerWidth, 12 * 12, 'second layer min width matches longer content');
		assert.strictEqual(node._minWidth, secondLayerWidth, 'node uses widest layer for min width');
		assert.strictEqual(node._maxWidth, secondLayerWidth, 'node uses widest layer for max width');
	});

	it('includes layer margins when determining width', function () {
		var node = {
			layers: [
				{ text: 'wide', margin: [10, 0, 6, 0] },
				{ text: 'small' }
			]
		};

		preprocessLayers(node);
		docMeasure.measureLayers(node);

		var expectedFirstMinWidth = (4 * 12) + 10 + 6;
		assert.strictEqual(node.layers[0]._minWidth, expectedFirstMinWidth, 'margin expands child min width');
		assert.strictEqual(node.layers[0]._maxWidth, expectedFirstMinWidth, 'margin expands child max width');
		assert.strictEqual(node._minWidth, expectedFirstMinWidth, 'parent min width respects widest margin-adjusted layer');
	});
});
