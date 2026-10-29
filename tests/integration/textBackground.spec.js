'use strict';

var assert = require('assert');
var sinon = require('sinon');

var integrationTestHelper = require('./integrationTestHelper');
var TextDecorator = require('../../js/TextDecorator').default;

describe('Integration test: text background', function () {

	var testHelper = new integrationTestHelper();

	function lineText(line) {
		return line.inlines.map(function (inline) {
			return inline.text;
		}).join('');
	}

	function findLine(pages, text) {
		var lines = pages[0].items.filter(function (pageItem) {
			return pageItem.type === 'line' && lineText(pageItem.item) === text;
		});
		assert.equal(lines.length, 1, 'expected one line with text "' + text + '"');
		return lines[0].item;
	}

	function backgroundRects(line) {
		var pdfDocument = testHelper.pdfDocument;
		var rect = sinon.stub(pdfDocument, 'rect').returnsThis();
		sinon.stub(pdfDocument, 'fill').returnsThis();
		sinon.stub(pdfDocument, 'fillColor').returnsThis();
		try {
			new TextDecorator(pdfDocument).drawBackground(line, line.x, line.y);
			return rect.getCalls().map(function (call) {
				return { x: call.args[0], width: call.args[2] };
			});
		} finally {
			sinon.restore();
		}
	}

	function assertNotLeftOfLine(rects, line) {
		rects.forEach(function (rect) {
			assert.ok(rect.x >= line.x, 'background starts at ' + rect.x + ', left of the line start ' + line.x);
		});
	}

	function assertClose(actual, expected) {
		assert.ok(Math.abs(actual - expected) < 1e-9, 'expected ' + expected + ', received ' + actual);
	}

	it('does not draw the background of whitespace-only text left of the line start', function () {
		var pages = testHelper.renderPages('A4', {
			content: [
				{ text: '       ', background: 'red' }
			]
		});

		var line = findLine(pages, '       ');
		assertNotLeftOfLine(backgroundRects(line), line);
	});

	it('does not draw the background of a whitespace-only table cell left of the cell', function () {
		var pages = testHelper.renderPages('A4', {
			content: [
				{
					table: {
						body: [
							[
								{ text: '        ', background: 'red' },
								{ text: 'random text', background: 'red' },
								{ text: '    random text', background: 'red' }
							]
						]
					}
				}
			]
		});

		var line = findLine(pages, '        ');
		assertNotLeftOfLine(backgroundRects(line), line);
	});

	it('starts the background of text with leading spaces at the line start', function () {
		var pages = testHelper.renderPages('A4', {
			content: [
				{ text: '    random text', background: 'red' }
			]
		});

		var line = findLine(pages, '    random text');
		var rects = backgroundRects(line);
		assert.ok(rects.length > 0);
		assertNotLeftOfLine(rects, line);
		assertClose(rects[0].x, line.x);
	});

	it('keeps the background of preserved leading spaces', function () {
		var pages = testHelper.renderPages('A4', {
			content: [
				{ text: '    random text', background: 'red', preserveLeadingSpaces: true }
			]
		});

		var line = findLine(pages, '    random text');
		var rects = backgroundRects(line);
		assert.ok(rects.length > 0);
		assertClose(rects[0].x, line.x);
		assertClose(rects[0].width, line.inlines[0].width);
	});

	it('keeps backgrounds continuous across the space between words', function () {
		var pages = testHelper.renderPages('A4', {
			content: [
				{ text: 'random text', background: 'red' }
			]
		});

		var line = findLine(pages, 'random text');
		var rects = backgroundRects(line);
		assert.ok(rects.length > 1);
		assertClose(rects[0].x, line.x);
		for (var i = 1; i < rects.length; i++) {
			assertClose(rects[i].x, rects[i - 1].x + rects[i - 1].width);
		}
	});

	it('keeps the background behind text with a negative leading indent', function () {
		var pages = testHelper.renderPages('A4', {
			content: [
				{ text: 'A hanging indent', margin: [20, 0, 0, 0], leadingIndent: -20, background: 'yellow' }
			]
		});

		var line = findLine(pages, 'A hanging indent');
		var rects = backgroundRects(line);
		assert.ok(rects.length > 0);
		assertClose(line.inlines[0].x, -20);
		assertClose(rects[0].x, line.x - 20);
		assertClose(rects[0].width, line.inlines[0].width);
	});
});
