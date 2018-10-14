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

describe('TextMeasurer', function () {

	const measurer = new DocMeasurerClass(sampleTestProvider);

	/* // TODO
	it('has been registered text node to measurer', function () {
		var ddContent = {
			text: 'text'
		};

		assert.doesNotThrow(function () {
			measurer.measureNode(ddContent)
		});
	});
	*/

	it('should measure text and set _inlines, _minWidth, _maxWidth and return node', function () {
		var node = {
			text: 'abc def'
		};

		var result = measurer.measureNode(node);

		assert(node._inlines);
		assert(node._minWidth);
		assert(node._maxWidth);

		assert.equal(node._inlines.length, 2);
		assert.equal(node._minWidth, 36);
		assert.equal(node._maxWidth, 84);

		assert.equal(node, result);
	});

});
