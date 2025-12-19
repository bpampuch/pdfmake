'use strict';

var assert = require('assert');

var DocPreprocessor = require('../../src/docPreprocessor');

function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

describe('FlowAccount DocPreprocessor inline text references', function () {
	var preprocessor;

	beforeEach(function () {
		preprocessor = new DocPreprocessor();
	});

	it('duplicates simple text nodes when reused inline', function () {
		var textNode = { text: 'shared', bold: true };
		var doc = {
			stack: [
				{ text: 'prefix ' },
				textNode,
				{ text: ' middle ' },
				textNode,
				{ text: ' suffix' }
			]
		};

		var result = preprocessor.preprocessDocument(doc);
		var occurrences = result.stack.filter(function (item) {
			return item.text === 'shared';
		});

		assert.strictEqual(occurrences.length, 2, 'shared node yielded two independent copies');
		assert.strictEqual(occurrences[0], occurrences[1], 'FlowAccount behavior reuses the same object instance');
		assert.strictEqual(occurrences[0], textNode, 'shared instance retains original formatting');
	});

	it('keeps nested structure intact when duplicating', function () {
		var emphasis = { text: [{ text: 'A', italics: true }, 'B'] };
		var doc = {
			stack: [
				{ text: 'Start ' },
				emphasis,
				emphasis,
				{ text: ' End' }
			]
		};

		var result = preprocessor.preprocessDocument(clone(doc));
		var copy1 = result.stack[1];
		var copy2 = result.stack[2];

		assert.notStrictEqual(copy1, copy2, 'nested copies are unique objects');
		assert.deepStrictEqual(copy1.text, copy2.text, 'nested inline array preserved');
		assert.strictEqual(copy1.text[0].italics, true, 'text properties retained');
	});
});
