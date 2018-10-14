var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocNormalizer = require('../../../../js/DocNormalizer').default;
const ContainerNormalizer = require('../../../../js/extensions/container/containerNormalizer').default;
const TextNormalizer = require('../../../../js/extensions/text/textNormalizer').default;

const DocNormalizerClass = mixin(DocNormalizer).with(ContainerNormalizer, TextNormalizer);

describe('ContainerNormalizer', function () {

	const normalizer = new DocNormalizerClass();

	it('has been registered stack node to normalizer', function () {
		var ddContent = {
			stack: []
		};

		assert.doesNotThrow(function () {
			normalizer.normalizeNode(ddContent)
		});
	});

	it('should expand shortcut from empty array to stack', function () {
		var ddContent = [];
		var result = normalizer.normalizeNode(ddContent);

		assert.equal(Array.isArray(result.stack), true);
		assert.equal(result.stack.length, 0);
	});

	it('should expand shortcut from array of texts to stack', function () {
		var ddContent = [
			'textA',
			'textB'
		];
		var result = normalizer.normalizeNode(ddContent);

		assert.equal(Array.isArray(result.stack), true);
		assert.equal(result.stack.length, 2);
		assert.equal(result.stack[0].text, 'textA');
		assert.equal(result.stack[1].text, 'textB');
	});

	it('should normalize texts in stack', function () {
		var ddContent = {
			stack: [
				'textA',
				'textB'
			]
		};
		var result = normalizer.normalizeNode(ddContent);

		assert.equal(Array.isArray(result.stack), true);
		assert.equal(result.stack.length, 2);
		assert.equal(result.stack[0].text, 'textA');
		assert.equal(result.stack[1].text, 'textB');
	});

	it('should normalize stack in stack', function () {
		var ddContent = [
			'textA',
			'textB',
			[
				'stack 1 - textA',
				'stack 1 - textB'
			],
			{
				stack: [
					'stack 2 - textA',
					'stack 2 - textB'
				]
			}
		];

		var result = normalizer.normalizeNode(ddContent);

		assert.equal(Array.isArray(result.stack), true);
		assert.equal(result.stack.length, 4);
		assert.equal(result.stack[0].text, 'textA');
		assert.equal(result.stack[1].text, 'textB');
		assert.equal(Array.isArray(result.stack[2].stack), true);
		assert.equal(result.stack[2].stack.length, 2);
		assert.equal(result.stack[2].stack[0].text, 'stack 1 - textA');
		assert.equal(result.stack[2].stack[1].text, 'stack 1 - textB');
		assert.equal(Array.isArray(result.stack[3].stack), true);
		assert.equal(result.stack[3].stack.length, 2);
		assert.equal(result.stack[3].stack[0].text, 'stack 2 - textA');
		assert.equal(result.stack[3].stack[1].text, 'stack 2 - textB');
	});

});
