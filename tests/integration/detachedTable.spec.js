'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');

describe('Integration test: detached content in table cells', function () {
	function texts(pages) {
		return pages.flatMap(page => page.items.filter(entry => entry.type === 'line')
			.map(entry => entry.item.inlines.map(inline => inline.text).join('')));
	}

	function borders(page) {
		return page.items.filter(entry => entry.type === 'vector').map(entry => entry.item);
	}

	['absolutePosition', 'relativePosition'].forEach(function (positionType) {
		[false, true].forEach(function (dontBreakRows) {
			it('preserves a table inside the detached block, ' + positionType + ', dontBreakRows=' + dontBreakRows, function () {
				var expected = Array.from({ length: 40 }, (_, index) => 'inner-' + index);
				function render(nested) {
					var overlay = {
						[positionType]: { x: !nested && positionType === 'relativePosition' ? 1 : 0, y: 0 },
						table: { widths: [100], dontBreakRows: dontBreakRows, headerRows: 1,
							body: [['HEADER']].concat(expected.map(text => [{ unbreakable: true, text: text }])) },
						layout: { hLineColor: () => 'blue', vLineColor: () => 'blue' }
					};
					return new IntegrationTestHelper().renderPages('A6', { content: nested ? [{
						table: { widths: ['*'], body: [[{ stack: [overlay, 'cell'] }], ['following']] },
						layout: { hLineColor: () => 'red', vLineColor: () => 'red',
							paddingTop: () => 0, paddingLeft: () => 0, hLineWidth: () => 0 }
					}] : [overlay] });
				}
				var pages = render(true);
				var reference = render(false);
				assert.deepEqual(texts(pages).filter(text => text.startsWith('inner-')), expected);
				assert.equal(texts(pages).filter(text => text === 'HEADER').length, pages.length);
				assert.deepEqual(pages.map(page => borders(page).filter(border => border.lineColor === 'blue')),
					reference.map(page => borders(page).filter(border => border.lineColor === 'blue')));
				pages.slice(1).forEach(page => assert.equal(borders(page).filter(border => border.lineColor === 'red').length, 0));
			});

			it('preserves real row breaks after detached content, ' + positionType + ', dontBreakRows=' + dontBreakRows, function () {
				function render(withOverlay) {
					var stack = [{ text: Array.from({ length: 40 }, (_, index) => 'flow-' + index).join('\n') }];
					if (withOverlay) {
						stack.unshift({ [positionType]: { x: 70, y: 90 }, text: 'overlay\n'.repeat(60) });
					}
					return new IntegrationTestHelper().renderPages('A6', { content: [{ table: {
						widths: ['*'], dontBreakRows: dontBreakRows, body: [[{ stack: stack }], ['following']]
					} }] });
				}
				var pages = render(true);
				var reference = render(false);
				pages.forEach((page, index) => assert.deepEqual(borders(page), reference[index] ? borders(reference[index]) : []));
				function flow(pages) {
					return pages.map(page => page.items.filter(entry => entry.type === 'line' &&
						/^(flow-|following)/.test(entry.item.inlines[0].text)).map(entry => ({
						x: entry.item.x, y: entry.item.y, text: entry.item.inlines.map(inline => inline.text).join('')
					})));
				}
				assert.deepEqual(flow(pages).flat(), flow(reference).flat());
				assert.deepEqual(flow(pages).slice(0, reference.length), flow(reference));
			});

			it('keeps outer borders short, ' + positionType + ', dontBreakRows=' + dontBreakRows, function () {
				var helper = new IntegrationTestHelper();
				var expected = Array.from({ length: 60 }, (_, index) => 'overlay-' + index);
				var overlay = { [positionType]: { x: 70, y: 90 }, text: expected.join('\n') };
				function render(stack) {
					return helper.renderPages('A6', { content: [{ table: {
						widths: ['*'], dontBreakRows: dontBreakRows,
						body: [[{ stack: stack }], ['following']]
					} }] });
				}
				var reference = render(['cell']);
				var pages = render([overlay, 'cell']);

				assert.equal(pages.length, 3);
				assert.deepEqual(texts(pages).filter(text => text.startsWith('overlay-')), expected);
				assert.deepEqual(texts([pages[0]]).filter(text => ['cell', 'following'].includes(text)), ['cell', 'following']);
				assert.deepEqual(borders(pages[0]), borders(reference[0]));
				pages.slice(1).forEach(page => assert.deepEqual(borders(page), []));
			});
		});
	});
});
