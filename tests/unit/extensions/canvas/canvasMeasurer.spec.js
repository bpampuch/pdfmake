var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocMeasurer = require('../../../../js/DocMeasurer').default;
const ContainerMeasurer = require('../../../../js/extensions/container/containerMeasurer').default;
const CanvasMeasurer = require('../../../../js/extensions/canvas/canvasMeasurer').default;

const DocMeasurerClass = mixin(DocMeasurer).with(ContainerMeasurer, CanvasMeasurer);

describe('CanvasMeasurer', function () {

	const measurer = new DocMeasurerClass();

	it('has been registered canvas node to measurer', function () {
		var ddContent = {
			canvas: []
		};

		assert.doesNotThrow(function () {
			measurer.measureNode(ddContent)
		});
	});

});
