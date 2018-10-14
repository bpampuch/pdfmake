var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocProcessor = require('../../../../js/DocProcessor').default;
const ContainerProcessor = require('../../../../js/extensions/container/containerProcessor').default;

const DocProcessorClass = mixin(DocProcessor).with(ContainerProcessor);

describe('ContainerProcessor', function () {

	const processor = new DocProcessorClass();

	it('has been registered stack node to processor', function () {
		var ddContent = {
			stack: []
		};

		assert.doesNotThrow(function () {
			processor.processNode(ddContent)
		});
	});

});
