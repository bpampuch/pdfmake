var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocProcessor = require('../../../../js/docProcessor').default;
const ContainerProcessor = require('../../../../js/extensions/container/containerProcessor').default;
const ImageProcessor = require('../../../../js/extensions/image/imageProcessor').default;

const DocProcessorClass = mixin(DocProcessor).with(ContainerProcessor, ImageProcessor);

describe('ImageProcessor', function () {

	const processor = new DocProcessorClass();

	it('has been registered image node to processor', function () {
		var ddContent = {
			image: 'imaginaryImage.png'
		};

		assert.doesNotThrow(function () {
			processor.processNode(ddContent)
		});
	});

});
