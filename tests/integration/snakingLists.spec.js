'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');

describe('Integration test: lists in snaking columns', function () {
	var testHelper = new IntegrationTestHelper();

	function near(actual, expected) {
		assert(Math.abs(actual - expected) < 1e-8, actual + ' should equal ' + expected);
	}

	['ul', 'ol'].forEach(function (type) {
		it('does not apply an outer list indentation twice when snaking columns are inside ' + type, function () {
			var inner = { [type]: Array.from({ length: 60 }, (_, i) => ({ text: 'i' + i })) };
			var columns = { snakingColumns: true, columnGap: 10, columns: [{ stack: [inner] }, { text: '' }] };
			var outer = { [type]: [{ stack: [{ text: 'PARENT' }, columns] }] };
			var pages = testHelper.renderPages('A6', { content: [outer, { text: 'OUTSIDE' }] });
			var columnWidth = (217.64 - outer._gapSize.width - 10) / 2;
			var firstX = 40 + outer._gapSize.width + inner._gapSize.width;
			assert(pages.length >= 2);
			pages.forEach(function (page) {
				page.items.filter(item => item.type === 'line').forEach(function (entry) {
					var text = entry.item.inlines.map(inline => inline.text).join('');
					if (/^i\d+$/.test(text)) {
						var second = entry.item.x >= 40 + outer._gapSize.width + columnWidth + 9;
						near(entry.item.x, firstX + (second ? columnWidth + 10 : 0));
						near(entry.item.maxWidth, columnWidth - inner._gapSize.width);
					} else if (text === 'OUTSIDE') {
						near(entry.item.x, 40);
					}
				});
			});
		});

		[false, true].forEach(function (nested) {
			[false, true].forEach(function (unequal) {
				[0, 15].forEach(function (margin) {
					it('preserves ' + type + ' indentation, nested=' + nested + ', unequal=' + unequal + ', margin=' + margin, function () {
						var list = { [type]: Array.from({ length: 60 }, (_, i) => ({ text: 'i' + i })) };
						var outer = nested ? { [type]: [{ stack: [{ text: 'PARENT' }, list, { text: 'IN' }] }] } : list;
						var firstWidth = unequal ? 90 : 103.82;
						var secondWidth = unequal ? 117.64 : 103.82;
						var pages = testHelper.renderPages('A6', {
							content: [{
								snakingColumns: true, columnGap: 10,
								columns: [{ width: firstWidth, margin: [margin, 0, 5, 0], stack: [outer, { text: 'AFTER' }] }, { width: secondWidth, text: '' }]
							}, { text: 'OUTSIDE' }]
						});
						assert(pages.length >= 2);
						var outerIndent = nested ? outer._gapSize.width : 0;
						var indent = list._gapSize.width + outerIndent;
						var items = [];
						pages.forEach(function (page) {
							page.items.filter(item => item.type === 'line').forEach(function (entry) {
								var line = entry.item;
								var text = line.inlines.map(inline => inline.text).join('');
								if (text === 'OUTSIDE') {
									near(line.x, 40);
									return;
								}
								if (!/^i\d+$/.test(text) && text !== 'AFTER' && text !== 'IN') {
									return;
								}
								var secondColumn = line.x >= 40 + firstWidth + 9;
								var base = secondColumn ? 40 + firstWidth + 10 : 40;
								var width = secondColumn ? secondWidth : firstWidth;
								var activeIndent = text === 'AFTER' ? 0 : text === 'IN' ? outerIndent : indent;
								near(line.x, base + margin + activeIndent);
								near(line.maxWidth, width - margin - 5 - activeIndent);
								if (/^i\d+$/.test(text)) {
									items.push(text);
									var marker = page.items.filter(item => item.item.x >= base - 1 && item.item.x < base + width).find(item => type === 'ul'
										? item.type === 'vector' && item.item.y >= line.y && item.item.y < line.y + testHelper.LINE_HEIGHT
										: item.type === 'line' && item.item !== line && item.item.y === line.y && /^\d+\.\s*$/.test(item.item.inlines.map(inline => inline.text).join('')));
									assert(marker);
									near(marker.item.x, line.x - list._gapSize.width + (type === 'ul' ? 2 : 0));
								}
							});
						});
						assert.deepEqual(items, Array.from({ length: 60 }, (_, i) => 'i' + i));
					});
				});
			});
		});
	});
});
