var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocPreprocessor = require('../../../../js/DocPreprocessor').default;
const ContainerPreprocessor = require('../../../../js/extensions/container/containerPreprocessor').default;
const ReferencePreprocessor = require('../../../../js/extensions/reference/referencePreprocessor').default;

const DocPreprocessorClass = mixin(DocPreprocessor).with(ContainerPreprocessor, ReferencePreprocessor);

describe('ReferencePreprocessor', function () {

	const preprocessor = new DocPreprocessorClass();

	it('has been registered pageReference node to preprocessor', function () {
		var ddContent = {
			pageReference: 'imaginary'
		};

		assert.doesNotThrow(function () {
			preprocessor.preprocessNode(ddContent)
		});
	});

	it('has been registered textReference node to preprocessor', function () {
		var ddContent = {
			textReference: 'imaginary'
		};

		assert.doesNotThrow(function () {
			preprocessor.preprocessNode(ddContent)
		});
	});

});
