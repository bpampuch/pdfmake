var assert = require('assert');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocNormalizer = require('../../../../js/docNormalizer').default;
const ContainerNormalizer = require('../../../../js/extensions/container/containerNormalizer').default;
const TextNormalizer = require('../../../../js/extensions/text/textNormalizer').default;

const DocNormalizerClass = mixin(DocNormalizer).with(ContainerNormalizer, TextNormalizer);


describe('TextNormalizer', function () {

	const normalizer = new DocNormalizerClass();

	it('should expand shortcut to text and normalize', function () {
		var ddContent = [
			'Abc123',
			'12',
			'12.34',
			'0',
			'',
			new String('Abcdef'),
			56,
			56.78,
			0,
			true,
			false,
			'true',
			'false',
			[],	// is stack
			'[]',
			[1, 2, 3], // is stack
			{},
			'{}',
			null,
			'null',
			undefined,
			'undefined',
		];
		var result = normalizer.normalizeNode(ddContent);

		assert.equal(Array.isArray(result.stack), true);
		assert.equal(result.stack.length, 22);
		assert.equal(result.stack[0].text, 'Abc123');
		assert.equal(result.stack[1].text, '12');
		assert.equal(result.stack[2].text, '12.34');
		assert.equal(result.stack[3].text, '0');
		assert.equal(result.stack[4].text, '');
		assert.equal(result.stack[5].text, 'Abcdef');
		assert.equal(result.stack[6].text, '56');
		assert.equal(result.stack[7].text, '56.78');
		assert.equal(result.stack[8].text, '0');
		assert.equal(result.stack[9].text, 'true');
		assert.equal(result.stack[10].text, 'false');
		assert.equal(result.stack[11].text, 'true');
		assert.equal(result.stack[12].text, 'false');
		assert.equal(Array.isArray(result.stack[13].stack), true);
		assert.equal(result.stack[13].stack.length, 0);
		assert.equal(result.stack[14].text, '[]');
		assert.equal(Array.isArray(result.stack[15].stack), true);
		assert.equal(result.stack[15].stack.length, 3);
		assert.equal(result.stack[15].stack[0].text, '1');
		assert.equal(result.stack[15].stack[1].text, '2');
		assert.equal(result.stack[15].stack[2].text, '3');
		assert.equal(result.stack[16].text, '');
		assert.equal(result.stack[17].text, '{}');
		assert.equal(result.stack[18].text, '');
		assert.equal(result.stack[19].text, 'null');
		assert.equal(result.stack[20].text, '');
		assert.equal(result.stack[21].text, 'undefined');
	});

	it('should normalize text', function () {
		var ddContent = [
			{ text: 'Abc123' },
			{ text: '12' },
			{ text: '12.34' },
			{ text: '0' },
			{ text: '' },
			{ text: new String('Abcdef') },
			{ text: 56 },
			{ text: 56.78 },
			{ text: 0 },
			{ text: true },
			{ text: false },
			{ text: 'true' },
			{ text: 'false' },
			{ text: [] }, // is text with nested texts
			{ text: '[]' },
			{ text: [1, 2, 3] }, // is text with nested texts
			{ text: {} },
			{ text: '{}' },
			{ text: null },
			{ text: 'null' },
			{ text: undefined },
			{ text: 'undefined' },
		];
		var result = normalizer.normalizeNode(ddContent);

		assert.equal(Array.isArray(result.stack), true);
		assert.equal(result.stack.length, 22);
		assert.equal(result.stack[0].text, 'Abc123');
		assert.equal(result.stack[1].text, '12');
		assert.equal(result.stack[2].text, '12.34');
		assert.equal(result.stack[3].text, '0');
		assert.equal(result.stack[4].text, '');
		assert.equal(result.stack[5].text, 'Abcdef');
		assert.equal(result.stack[6].text, '56');
		assert.equal(result.stack[7].text, '56.78');
		assert.equal(result.stack[8].text, '0');
		assert.equal(result.stack[9].text, 'true');
		assert.equal(result.stack[10].text, 'false');
		assert.equal(result.stack[11].text, 'true');
		assert.equal(result.stack[12].text, 'false');
		assert.equal(Array.isArray(result.stack[13].text), true);
		assert.equal(result.stack[13].text.length, 0);
		assert.equal(result.stack[14].text, '[]');
		assert.equal(Array.isArray(result.stack[15].text), true);
		assert.equal(result.stack[15].text.length, 3);
		assert.equal(result.stack[15].text[0].text, '1');
		assert.equal(result.stack[15].text[1].text, '2');
		assert.equal(result.stack[15].text[2].text, '3');
		assert.equal(result.stack[16].text, '');
		assert.equal(result.stack[17].text, '{}');
		assert.equal(result.stack[18].text, '');
		assert.equal(result.stack[19].text, 'null');
		assert.equal(result.stack[20].text, '');
		assert.equal(result.stack[21].text, 'undefined');
	});

	it('should replace tab as 4 spaces', function () {
		var ddContent = [
			'a\tb',
			{text:'a\tb'},
			'a\tb\tc',
			{text:'a\tb\tc'},
		];
		var result = normalizer.normalizeNode(ddContent);

		assert.equal(Array.isArray(result.stack), true);
		assert.equal(result.stack.length, 4);
		assert.equal(result.stack[0].text, 'a    b');
		assert.equal(result.stack[1].text, 'a    b');
		assert.equal(result.stack[2].text, 'a    b    c');
		assert.equal(result.stack[3].text, 'a    b    c');
	});

});
