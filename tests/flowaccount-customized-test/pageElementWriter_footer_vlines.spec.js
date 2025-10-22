'use strict';

var assert = require('assert');
var sinon = require('sinon');

// Use rewire to access internal module state for testing
var rewire = require('rewire');
var PageElementWriter = rewire('../../src/pageElementWriter');

describe('PageElementWriter - Footer Vertical Lines on Page Break', function () {
	var writer, context, tracker;

	beforeEach(function () {
		// Create mock context with required methods and properties
		context = {
			x: 40,
			y: 700, // Near page bottom to trigger footer break
			availableHeight: 100,
			page: 0,
			pages: [{ items: [], vectors: [] }],
			pageMargins: { top: 40, bottom: 40, left: 40, right: 40 },
			moveDown: sinon.stub(),
			addVector: sinon.stub(),
			getCurrentPage: function() {
				return {
					pageSize: { width: 595, height: 842 } // A4 size
				};
			},
			_footerGapOption: {
				enabled: true,
				lineWidth: 1,
				lineColor: 'black',
				columns: {
					widthLength: 3,
					content: {
						vLines: [100, 200, 300] // Three vertical lines collected during table processing
					}
				}
			}
		};

		// Mock tracker
		tracker = {
			emit: sinon.stub(),
			startTracking: sinon.stub(),
			stopTracking: sinon.stub()
		};

		// Create PageElementWriter instance
		writer = new PageElementWriter(context, tracker);
		
		// Mock the writer.writer methods
		writer.writer = {
			context: context,
			addFragment: sinon.stub().returns(false), // Simulate fragment doesn't fit
			addVector: sinon.stub()
		};

		// Mock moveToNextPage
		writer.moveToNextPage = sinon.stub().callsFake(function() {
			context.page++;
			context.y = context.pageMargins.top;
			context.availableHeight = 842 - context.pageMargins.top - context.pageMargins.bottom;
		});
	});

	it('should draw vertical lines at page bottom when footer breaks to new page', function () {
		// Create a footer fragment
		var fragment = {
			height: 150, // Too tall to fit in remaining space
			items: [],
			_footerGapOption: {
				enabled: true,
				lineWidth: 1,
				lineColor: 'black',
				columns: {
					widthLength: 3,
					content: {
						vLines: [100, 200, 300]
					}
				}
			}
		};

		// Call addFragment with isFooter=1 (first attempt)
		var result = writer.addFragment(fragment, false, false, false, 1);

		// Should return undefined (footer didn't fit and was retried)
		assert.strictEqual(result, undefined);

		// Should have called drawFooterVerticalLines, which draws vectors
		assert.strictEqual(writer.writer.addVector.callCount, 3, 'Should draw 3 vertical lines');

		// Verify each vertical line was drawn correctly
		var expectedBottomY = 842 - 40; // pageHeight - bottomMargin = 802
		var expectedTopY = 700; // Original Y position

		// Check first vertical line
		var call1 = writer.writer.addVector.getCall(0);
		assert.deepStrictEqual(call1.args[0], {
			type: 'line',
			x1: 100,
			y1: expectedTopY,
			x2: 100,
			y2: expectedBottomY,
			lineWidth: 1,
			lineColor: 'black',
			dash: undefined
		});
		assert.strictEqual(call1.args[1], true, 'ignoreContextX should be true');
		assert.strictEqual(call1.args[2], true, 'ignoreContextY should be true');

		// Check second vertical line
		var call2 = writer.writer.addVector.getCall(1);
		assert.strictEqual(call2.args[0].x1, 200);
		assert.strictEqual(call2.args[0].y1, expectedTopY);
		assert.strictEqual(call2.args[0].y2, expectedBottomY);

		// Check third vertical line
		var call3 = writer.writer.addVector.getCall(2);
		assert.strictEqual(call3.args[0].x1, 300);
		assert.strictEqual(call3.args[0].y1, expectedTopY);
		assert.strictEqual(call3.args[0].y2, expectedBottomY);

		// Should have moved to next page
		assert.strictEqual(writer.moveToNextPage.callCount, 1);

		// vLines should NOT be cleared - they will be reused on next page
		assert.strictEqual(fragment._footerGapOption.columns.content.vLines.length, 3);

		// Should have re-attempted to add fragment with isFooter=2
		assert.strictEqual(writer.writer.addFragment.callCount, 2);
		assert.strictEqual(writer.writer.addFragment.getCall(1).args[4], 2, 'Second call should use isFooter=2');
	});

	it('should not draw vertical lines when _footerGapOption is not enabled', function () {
		var fragment = {
			height: 150,
			items: [],
			_footerGapOption: {
				enabled: false,
				columns: {
					content: {
						vLines: [100, 200, 300]
					}
				}
			}
		};

		writer.addFragment(fragment, false, false, false, 1);

		// Should not draw any vectors
		assert.strictEqual(writer.writer.addVector.callCount, 0);

		// Should still move to next page
		assert.strictEqual(writer.moveToNextPage.callCount, 1);
	});

	it('should not draw vertical lines when vLines array is empty', function () {
		var fragment = {
			height: 150,
			items: [],
			_footerGapOption: {
				enabled: true,
				lineWidth: 1,
				lineColor: 'black',
				columns: {
					content: {
						vLines: [] // Empty array
					}
				}
			}
		};

		writer.addFragment(fragment, false, false, false, 1);

		// Should not draw any vectors
		assert.strictEqual(writer.writer.addVector.callCount, 0);
	});

	it('should use custom line width and color from footerGapOption', function () {
		var fragment = {
			height: 150,
			items: [],
			_footerGapOption: {
				enabled: true,
				columns: {
					style: {
						lineWidth: 2,
						color: '#d5d5d5',
						dash: { length: 3 }
					},
					content: {
						vLines: [150]
					}
				}
			}
		};

		writer.addFragment(fragment, false, false, false, 1);

		// Should draw one vector with custom style from columns.style
		assert.strictEqual(writer.writer.addVector.callCount, 1);
		
		var vectorArgs = writer.writer.addVector.getCall(0).args[0];
		assert.strictEqual(vectorArgs.lineWidth, 2);
		assert.strictEqual(vectorArgs.lineColor, '#d5d5d5');
		assert.deepStrictEqual(vectorArgs.dash, { length: 3 });
	});

	it('should fall back to context._footerGapOption if fragment does not have it', function () {
		var fragment = {
			height: 150,
			items: []
			// No _footerGapOption on fragment
		};

		// Context has _footerGapOption
		context._footerGapOption = {
			enabled: true,
			lineWidth: 1,
			lineColor: 'red',
			columns: {
				content: {
					vLines: [120, 240]
				}
			}
		};

		writer.addFragment(fragment, false, false, false, 1);

		// Should draw vectors from context._footerGapOption
		assert.strictEqual(writer.writer.addVector.callCount, 2);
		
		var call1 = writer.writer.addVector.getCall(0);
		assert.strictEqual(call1.args[0].x1, 120);
		assert.strictEqual(call1.args[0].lineColor, 'red');
		
		var call2 = writer.writer.addVector.getCall(1);
		assert.strictEqual(call2.args[0].x1, 240);
	});
});
