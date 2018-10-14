var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocProcessor = require('../../../../js/DocProcessor').default;
const ContainerProcessor = require('../../../../js/extensions/container/containerProcessor').default;
const CanvasProcessor = require('../../../../js/extensions/canvas/canvasProcessor').default;

const DocProcessorClass = mixin(DocProcessor).with(ContainerProcessor, CanvasProcessor);

describe('CanvasProcessor', function () {

	const processor = new DocProcessorClass();

	it('has been registered canvas node to processor', function () {
		var ddContent = {
			canvas: []
		};

		assert.doesNotThrow(function () {
			processor.processNode(ddContent)
		});
	});

});
