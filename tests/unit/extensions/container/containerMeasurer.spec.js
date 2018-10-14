var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocMeasurer = require('../../../../js/DocMeasurer').default;
const ContainerMeasurer = require('../../../../js/extensions/container/containerMeasurer').default;
const TextMeasurer = require('../../../../js/extensions/text/textMeasurer').default;

const DocMeasurerClass = mixin(DocMeasurer).with(ContainerMeasurer, TextMeasurer);

var sampleTestProvider = {
	provideFont: function (familyName, bold, italics) {
		return {
			widthOfString: function (text, size) {
				return text.length * size * (bold ? 1.5 : 1) * (italics ? 1.1 : 1);
			},
			lineHeight: function (size) {
				return size;
			}
		};
	}
};

describe('ContainerMeasurer', function () {

	const measurer = new DocMeasurerClass(sampleTestProvider);

	it('has been registered stack node to measurer', function () {
		var ddContent = {
			stack: []
		};

		assert.doesNotThrow(function () {
			measurer.measureNode(ddContent)
		});
	});

	describe('measureVerticalContainer', function () {
		it('should extend document-definition-object if text paragraphs are used', function () {
			var ddContent = {
				stack: [
					{ text: 'asdasd' },
					{ text: 'bbbb' }
				]
			};

			var result = measurer.measureNode(ddContent);

			assert(result.stack[0]._minWidth);
			assert(result.stack[0]._maxWidth);
		});

		it('should calculate _minWidth and _maxWidth of all elements', function () {
			var ddContent = {
				stack: [
					{ text: 'this is a test' },
					{ text: 'another one' }
				]
			};

			var result = measurer.measureNode(ddContent);

			assert.equal(result.stack[0]._minWidth, 4 * 12);
			assert.equal(result.stack[0]._maxWidth, 14 * 12);
			assert.equal(result.stack[1]._minWidth, 7 * 12);
			assert.equal(result.stack[1]._maxWidth, 11 * 12);
		});

		it('should set _minWidth and _maxWidth to the max of inner min/max widths', function () {
			var ddContent = {
				stack: [
					{ text: 'this is a test' },
					{ text: 'another one' }
				]
			};

			var result = measurer.measureNode(ddContent);

			assert.equal(result._minWidth, 7 * 12);
			assert.equal(result._maxWidth, 14 * 12);
		});

	});

});
