'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');

describe('Integration test: margins in snaking columns', function () {
	var testHelper = new IntegrationTestHelper();

	function near(actual, expected) {
		assert(Math.abs(actual - expected) < 1e-8, actual + ' should equal ' + expected);
	}

	[[15, 0], [0, 10], [15, 10], [-5, 10]].forEach(function (margin) {
		[false, true].forEach(function (unequal) {
			it('preserves container margins ' + margin + ', unequal columns=' + unequal, function () {
				var firstWidth = unequal ? 90 : 103.82;
				var secondWidth = unequal ? 117.64 : 103.82;
				var pages = testHelper.renderPages('A6', {
					content: [{
						snakingColumns: true, columnGap: 10,
						columns: [{
							width: firstWidth, margin: [margin[0], 0, margin[1], 0],
							stack: Array.from({ length: 60 }, (_, i) => ({ text: 'margin-' + i }))
						}, { width: secondWidth, text: '' }]
					}, { text: 'OUTSIDE' }]
				});
				assert.equal(pages.length, 2);
				var texts = [];
				pages.forEach(function (page) {
					var lines = page.items.filter(item => item.type === 'line').map(item => item.item);
					var first = lines.find(line => line.inlines.some(inline => inline.text.startsWith('margin-')));
					near(first.x, 40 + margin[0]);
					lines.forEach(function (line) {
						var text = line.inlines.map(inline => inline.text).join('');
						if (text === 'OUTSIDE') {
							near(line.x, 40);
							near(line.maxWidth, 217.64);
						} else if (text.startsWith('margin-')) {
							texts.push(text);
							var second = line.x > 40 + firstWidth / 2;
							near(line.x, 40 + margin[0] + (second ? firstWidth + 10 : 0));
							near(line.maxWidth, (second ? secondWidth : firstWidth) - margin[0] - margin[1]);
						}
					});
				});
				assert.deepEqual(texts, Array.from({ length: 60 }, (_, i) => 'margin-' + i));
			});
		});
	});
});
