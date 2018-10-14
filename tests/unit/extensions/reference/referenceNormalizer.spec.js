var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocNormalizer = require('../../../../js/docNormalizer').default;
const ContainerNormalizer = require('../../../../js/extensions/container/containerNormalizer').default;
const ReferenceNormalizer = require('../../../../js/extensions/reference/referenceNormalizer').default;

const DocNormalizerClass = mixin(DocNormalizer).with(ContainerNormalizer, ReferenceNormalizer);

describe('ReferenceNormalizer', function () {

	const normalizer = new DocNormalizerClass();

	it('has been registered pageReference node to normalizer', function () {
		var ddContent = {
			pageReference: 'imaginary'
		};

		assert.doesNotThrow(function () {
			normalizer.normalizeNode(ddContent)
		});
	});

	it('has been registered textReference node to normalizer', function () {
		var ddContent = {
			textReference: 'imaginary'
		};

		assert.doesNotThrow(function () {
			normalizer.normalizeNode(ddContent)
		});
	});

});
