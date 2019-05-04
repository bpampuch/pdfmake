
const assert = require('assert');

const DocPreprocessor = require('../../js/DocPreprocessor').default;

describe('DocPreprocessor', function () {

	const docPreprocessor = new DocPreprocessor();

	describe('text', function () {

		it('has been registered text node to normalizer', function () {
			var ddContent = {
				text: 'text'
			};

			assert.doesNotThrow(function () {
				docPreprocessor.preprocessNode(ddContent);
			});
		});

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
				[], // is stack
				'[]',
				[1, 2, 3], // is stack
				{},
				'{}',
				null,
				'null',
				undefined,
				'undefined',
			];
			var result = docPreprocessor.preprocessNode(ddContent);

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
			var result = docPreprocessor.preprocessNode(ddContent);

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
				{ text: 'a\tb' },
				'a\tb\tc',
				{ text: 'a\tb\tc' },
				{
					text: [
						'A\tB',
						{ text: 'A\tB' },
					]
				}
			];
			var result = docPreprocessor.preprocessNode(ddContent);

			assert.equal(Array.isArray(result.stack), true);
			assert.equal(result.stack.length, 5);
			assert.equal(result.stack[0].text, 'a    b');
			assert.equal(result.stack[1].text, 'a    b');
			assert.equal(result.stack[2].text, 'a    b    c');
			assert.equal(result.stack[3].text, 'a    b    c');
			assert.equal(result.stack[4].text[0].text, 'A    B');
			assert.equal(result.stack[4].text[1].text, 'A    B');
		});

		it('should support text in nested nodes', function () {
			var ddContent = [
				{
					text: {
						text: {
							text: 'hello world'
						}
					}
				}
			];
			var result = docPreprocessor.preprocessNode(ddContent);

			assert.equal(Array.isArray(result.stack), true);
			assert.equal(result.stack.length, 1);
			assert.equal(Array.isArray(result.stack[0].text), true);
			assert.equal(result.stack[0].text.length, 1);
			assert.equal(Array.isArray(result.stack[0].text[0].text), true);
			assert.equal(result.stack[0].text[0].text.length, 1);
			assert.equal(result.stack[0].text[0].text[0].text, 'hello world');
		});

	});

	describe('toc', function () {

		it('should support simple toc on begin of document', function () {
			var ddContent = [
				{
					toc: {
					}
				},
				{
					text: 'Header 1',
					tocItem: true
				},
				{
					text: 'Header 2',
					tocItem: true
				}
			];
			var result = docPreprocessor.preprocessDocument(ddContent);

			assert.equal(Array.isArray(result.stack), true);
			assert.equal(result.stack.length, 3);
			assert.equal(result.stack[0].toc.id, '_default_');
			assert.equal(Array.isArray(result.stack[0].toc._items), true);
			assert.equal(result.stack[0].toc._items.length, 2);
			assert.equal(result.stack[1].id, 'toc-_default_-0');
			assert.equal(result.stack[2].id, 'toc-_default_-1');
		});

		it('should support simple toc on end of document', function () {
			var ddContent = [
				{
					text: 'Header 1',
					tocItem: true
				},
				{
					text: 'Header 2',
					tocItem: true
				},
				{
					toc: {
					}
				},
			];
			var result = docPreprocessor.preprocessDocument(ddContent);

			assert.equal(Array.isArray(result.stack), true);
			assert.equal(result.stack.length, 3);
			assert.equal(result.stack[0].id, 'toc-_default_-0');
			assert.equal(result.stack[1].id, 'toc-_default_-1');
			assert.equal(result.stack[2].toc.id, '_default_');
			assert.equal(Array.isArray(result.stack[2].toc._items), true);
			assert.equal(result.stack[2].toc._items.length, 2);
		});

	});

});
