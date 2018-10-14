var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocProcessor = require('../../../../js/DocProcessor').default;
const ContainerProcessor = require('../../../../js/extensions/container/containerProcessor').default;
const TextProcessor = require('../../../../js/extensions/text/textProcessor').default;

const DocProcessorClass = mixin(DocProcessor).with(ContainerProcessor, TextProcessor);

describe('TextProcessor', function () {

	const processor = new DocProcessorClass();

	it('has been registered text node to processor', function () {
		var ddContent = {
			text: 'text'
		};

		assert.doesNotThrow(function () {
			processor.processNode(ddContent)
		});
	});

});
