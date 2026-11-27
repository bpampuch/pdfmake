'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');

describe('Integration test: oversized unbreakable children of positioned parents', function () {
	function lines(pages) {
		return pages.map(page => page.items.filter(entry => entry.type === 'line').map(entry => ({
			text: entry.item.inlines.map(inline => inline.text).join(''),
			x: entry.item.x,
			y: entry.item.y
		})));
	}

	['absolutePosition', 'relativePosition'].forEach(function (positionType) {
		[false, true].forEach(function (ownColumns) {
			[false, true].forEach(function (reflow) {
				it('isolates snaking columns across positioned parents, ' + positionType +
					', ownColumns=' + ownColumns + ', reflow=' + reflow, function () {
					var expected = Array.from({ length: 60 }, (_, index) => 'overlay-' + index);
					function render(withOverlay, outerColumns) {
						var table = { margin: [3, 5, 2, 4], table: { widths: [90], dontBreakRows: true, body: [
							['prefix'], [{ stack: expected.map(text => ({ text: text })) }], ['suffix']
						] } };
						var overlay = { [positionType]: { x: 10, y: positionType === 'absolutePosition' ? 90 : 0 },
							stack: ['overlayPrefix', ...(ownColumns ? [{ snakingColumns: true, columns: [
								{ width: 110, stack: [table] }, { width: 100, text: '' }
							] }] : [table]), 'overlaySuffix'] };
						var stack = withOverlay ? ['before', overlay, 'flow'] : ['before', 'flow'];
						var broken = false;
						return lines(new IntegrationTestHelper().renderPages('A6', {
							content: outerColumns ? [{ snakingColumns: true, columns: [
								{ width: 170, stack: stack }, { width: 100, text: 'other' }
							] }, 'END'] : stack,
							pageBreakBefore: reflow ? node => {
								if (!broken && node.text === 'flow') {
									broken = true;
									return true;
								}
								return false;
							} : undefined
						}));
					}
					var actual = render(true, true);
					var reference = render(false, true);
					function mainFlow(pages) {
						return pages.flatMap((page, index) => page.filter(line => ['before', 'flow', 'END', 'other'].includes(line.text))
							.map(line => ({ ...line, page: index + 1 })));
					}
					assert.deepStrictEqual(mainFlow(actual), mainFlow(reference));
					assert.deepStrictEqual(actual.flat().filter(line => line.text.startsWith('overlay-')).map(line => line.text), expected);
					function overlayLines(pages) {
						return pages.map(page => page.filter(line => !['before', 'flow', 'END', 'other'].includes(line.text)));
					}
					assert.deepStrictEqual(overlayLines(actual), overlayLines(render(true, false)));
				});
			});
		});
		['stack', 'table'].forEach(function (contentType) {
			[false, true].forEach(function (precedingContent) {
				[false, true].forEach(function (withMargin) {
					it('preserves the positioned flow, ' + positionType + ', ' + contentType +
						', precedingContent=' + precedingContent + ', withMargin=' + withMargin, function () {
						var expected = Array.from({ length: 60 }, (_, index) => 'overlay-' + index);
						function render(unbreakable) {
							var child = contentType === 'stack'
								? { unbreakable: unbreakable, stack: expected.map(text => ({ text: text })) }
								: { table: { dontBreakRows: unbreakable, body: [[{ stack: expected.map(text => ({ text: text })) }]] } };
							if (precedingContent && contentType === 'table') {
								child.table.body.unshift(['prefix']);
							}
							if (withMargin) {
								child.margin = [3, 5, 0, 0];
							}
							return new IntegrationTestHelper().renderPages('A6', { content: [
								'before',
								{ [positionType]: { x: 70, y: 90 },
									stack: precedingContent && contentType === 'stack' ? ['prefix', child] : [child] },
								'flow'
							] });
						}
						var reference = lines(render(false));
						var actual = lines(render(true));
						assert.deepStrictEqual(actual, reference);
						assert.deepStrictEqual(actual.flat().filter(line => line.text.startsWith('overlay-')).map(line => line.text), expected);
						assert.ok(actual[0].some(line => line.text === 'overlay-0'));
						assert.deepStrictEqual(actual[0].filter(line => line.text === 'flow'), [{ text: 'flow', x: 40, y: 54.0625 }]);
					});
				});
			});
		});
	});
});
