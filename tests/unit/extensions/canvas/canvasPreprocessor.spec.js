var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocPreprocessor = require('../../../../js/DocPreprocessor').default;
const ContainerPreprocessor = require('../../../../js/extensions/container/containerPreprocessor').default;
const CanvasPreprocessor = require('../../../../js/extensions/canvas/canvasPreprocessor').default;

const DocPreprocessorClass = mixin(DocPreprocessor).with(ContainerPreprocessor, CanvasPreprocessor);

describe('CanvasPreprocessor', function () {

	const preprocessor = new DocPreprocessorClass();

	it('has been registered canvas node to preprocessor', function () {
		var ddContent = {
			canvas: []
		};

		assert.doesNotThrow(function () {
			preprocessor.preprocessNode(ddContent)
		});
	});

});
