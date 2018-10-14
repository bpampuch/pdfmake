var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocMeasurer = require('../../../../js/docMeasurer').default;
const ContainerMeasurer = require('../../../../js/extensions/container/containerMeasurer').default;
const TextMeasurer = require('../../../../js/extensions/text/textMeasurer').default;

const DocMeasurerClass = mixin(DocMeasurer).with(ContainerMeasurer, TextMeasurer);

describe('TextMeasurer', function () {

	const measurer = new DocMeasurerClass();
	/* // TODO
		it('has been registered text node to measurer', function () {
			var ddContent = {
				text: 'text'
			};

			assert.doesNotThrow(function () {
				measurer.measureNode(ddContent)
			});
		});*/

});
