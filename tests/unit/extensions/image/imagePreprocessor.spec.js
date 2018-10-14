var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocPreprocessor = require('../../../../js/docPreprocessor').default;
const ContainerPreprocessor = require('../../../../js/extensions/container/containerPreprocessor').default;
const ImagePreprocessor = require('../../../../js/extensions/image/imagePreprocessor').default;

const DocPreprocessorClass = mixin(DocPreprocessor).with(ContainerPreprocessor, ImagePreprocessor);

describe('ImagePreprocessor', function () {

	const preprocessor = new DocPreprocessorClass();

	it('has been registered image node to preprocessor', function () {
		var ddContent = {
			image: 'imaginaryImage.png'
		};

		assert.doesNotThrow(function () {
			preprocessor.preprocessNode(ddContent)
		});
	});

});
