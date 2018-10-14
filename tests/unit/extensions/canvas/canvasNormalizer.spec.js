var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocNormalizer = require('../../../../js/docNormalizer').default;
const ContainerNormalizer = require('../../../../js/extensions/container/containerNormalizer').default;
const CanvasNormalizer = require('../../../../js/extensions/canvas/canvasNormalizer').default;

const DocNormalizerClass = mixin(DocNormalizer).with(ContainerNormalizer, CanvasNormalizer);

describe('CanvasNormalizer', function () {

	const normalizer = new DocNormalizerClass();

	it('has been registered canvas node to normalizer', function () {
		var ddContent = {
			canvas: []
		};

		assert.doesNotThrow(function () {
			normalizer.normalizeNode(ddContent)
		});
	});

});
