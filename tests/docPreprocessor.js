'use strict';

var assert = require('assert');

const DocPreprocessor = require('../src/docPreprocessor');

describe('DocPreProcessor', function () {

	const docPreprocessor = new DocPreprocessor();

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
