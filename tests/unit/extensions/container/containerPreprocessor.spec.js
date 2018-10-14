var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocPreprocessor = require('../../../../js/docPreprocessor').default;
const ContainerPreprocessor = require('../../../../js/extensions/container/containerPreprocessor').default;

const DocPreprocessorClass = mixin(DocPreprocessor).with(ContainerPreprocessor);

describe('ContainerPreprocessor', function () {

	const preprocessor = new DocPreprocessorClass();

	it('has been registered stack node to preprocessor', function () {
		var ddContent = {
			stack: []
		};

		assert.doesNotThrow(function () {
			preprocessor.preprocessNode(ddContent)
		});
	});

});
