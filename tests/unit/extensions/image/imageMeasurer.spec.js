var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocMeasurer = require('../../../../js/docMeasurer').default;
const ContainerMeasurer = require('../../../../js/extensions/container/containerMeasurer').default;
const ImageMeasurer = require('../../../../js/extensions/image/imageMeasurer').default;

const DocMeasurerClass = mixin(DocMeasurer).with(ContainerMeasurer, ImageMeasurer);

describe('ImageMeasurer', function () {

	const measurer = new DocMeasurerClass({ provideImage(src) { return { width: 100, height: 100 }; } });

	it('has been registered image node to measurer', function () {
		var ddContent = {
			image: 'imaginaryImage.png'
		};

		assert.doesNotThrow(function () {
			measurer.measureNode(ddContent)
		});
	});

});
