'use strict';

var assert = require('assert');

var ElementWriter = require('../js/elementWriter').default;

describe('ElementWriter', function () {
	var ew, ctx, page, tracker, fakePosition;

	beforeEach(function () {
		fakePosition = {fake: 'position'};
		page = {items: []};
		ctx = {
			x: 10,
			y: 20,
			availableWidth: 100,
			availableHeight: 100,
			getCurrentPage: function () {
				return page;
			},
			getCurrentPosition: function () {
				return fakePosition;
			},
			moveDown: function (offset) {
				ctx.y += offset;
				ctx.availableHeight -= offset;
			}
		};
		tracker = {emit: function () {}};
		ew = new ElementWriter(ctx, tracker);

	});

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
					x: 0,
				},
				{
					x: 30,
				},
				{
					x: 50
				}
			],
			x: x,
			y: y
		};
	}


});
