'use strict';

var assert = require('assert');
var sinon = require('sinon');

var DocumentContext = require('../js/documentContext').default;
var PageElementWriter = require('../js/pageElementWriter').default;

describe('PageElementWriter', function () {
	var pew, ctx, tracker, pageSize;

	var DOCUMENT_WIDTH = 600;
	var DOCUMENT_HEIGHT = 1100;
	var DOCUMENT_ORIENTATION = 'portrait';
	var INLINE_TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAQMAAADNIO3CAAAAA1BMVEUAAN7GEcIJAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB98DBREbA3IZ3d8AAAALSURBVAjXY2BABwAAEgAB74lUpAAAAABJRU5ErkJggg==';

	var MARGINS = {
		left: 40,
		right: 60,
		top: 30,
		bottom: 70
	};

	var AVAILABLE_HEIGHT = 1000;
	var AVAILABLE_WIDTH = 500;

	function buildLine(height, alignment, x, y) {
		return {
			getHeight: function () {
				return height;
			},
			getWidth: function () {
				return 60;
			},
			inlines: [
				{
					alignment: alignment,
					x: 0
				},
				{
					x: 30
				},
				{
					x: 50
				}
			],
			x: x,
			y: y
		};
	}

	function buildImage(height) {
		return {
			image: INLINE_TEST_IMAGE,
			_margin: null,
			_maxWidth: 100,
			_minWidth: 100,
			_width: 100,
			_height: height,
			positions: []
		};
	}

	function addOneTenthLines(count) {
		var lastPosition;
		for (var i = 0; i < count; i++) {
			var line = buildLine(AVAILABLE_HEIGHT / 10);
			lastPosition = pew.addLine(line);
		}
		return lastPosition;
	}

	function createRepeatable(marker, height) {
		var rep = {items: []};
		rep.height = height;

		var repLine = buildLine(height);
		repLine.marker = marker;

		rep.items.push({
			type: 'line',
			item: repLine
		});

		rep.insertedOnPages = [];

		return rep;
	}

	beforeEach(function () {
		pageSize = {width: DOCUMENT_WIDTH, height: DOCUMENT_HEIGHT, orientation: DOCUMENT_ORIENTATION};
		ctx = new DocumentContext(pageSize, MARGINS);
		tracker = {emit: sinon.spy()};
		pew = new PageElementWriter(ctx, tracker);
	});

	});
});
