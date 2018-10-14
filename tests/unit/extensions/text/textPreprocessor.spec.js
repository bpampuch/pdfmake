var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocPreprocessor = require('../../../../js/DocPreprocessor').default;
const ContainerPreprocessor = require('../../../../js/extensions/container/containerPreprocessor').default;
const TextPreprocessor = require('../../../../js/extensions/text/textPreprocessor').default;

const DocPreprocessorClass = mixin(DocPreprocessor).with(ContainerPreprocessor, TextPreprocessor);

describe('TextPreprocessor', function () {

	const preprocessor = new DocPreprocessorClass();

	it('has been registered text node to preprocessor', function () {
		var ddContent = {
			text: 'text'
		};

		assert.doesNotThrow(function () {
			preprocessor.preprocessNode(ddContent)
		});
	});

});
