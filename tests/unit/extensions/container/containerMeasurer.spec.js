var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocMeasurer = require('../../../../js/docMeasurer').default;
const ContainerMeasurer = require('../../../../js/extensions/container/containerMeasurer').default;

const DocMeasurerClass = mixin(DocMeasurer).with(ContainerMeasurer);

describe('ContainerMeasurer', function () {

	const measurer = new DocMeasurerClass();

	it('has been registered container node to measurer', function () {
		var ddContent = {
			stack: []
		};

		assert.doesNotThrow(function () {
			measurer.measureNode(ddContent)
		});
	});

});
