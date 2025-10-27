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
				columns: {
					widthLength: 3,
					includeOuter: true,
					style: {
						lineWidth: 0.5,
						color: '#bbbbbb'
					},
					content: {
						vLines: [0, 100, 200, 300], // Four vertical line positions (including borders)
						vLineWidths: [0.5, 0.5, 0.5, 0.5]
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
				columns: {
					widthLength: 3,
					includeOuter: true,
					style: {
						lineWidth: 0.5,
						color: '#bbbbbb'
					},
					content: {
						vLines: [0, 100, 200, 300], // Collected X positions (ctx.x + x)
						vLineWidths: [0.5, 0.5, 0.5, 0.5]
					}
				}
			}
		};

		// Call addFragment with isFooter=1 (first attempt)
		var result = writer.addFragment(fragment, false, false, false, 1);

		// Should return false (footer didn't fit, drew lines, moved to next page)
		assert.strictEqual(result, false);

		// Should have called drawFooterVerticalLines (4 lines) + drawFooterHorizontalLine (1 line)
		// With includeOuter=true and 4 positions, should draw all 4 vertical lines + 1 horizontal
		assert.strictEqual(writer.writer.addVector.callCount, 5, 'Should draw 4 vertical lines + 1 horizontal line');

		// Verify each vertical line was drawn correctly (first 4 calls)
		var expectedBottomY = 842 - 40; // pageHeight - bottomMargin = 802
		var expectedTopY = 700; // Original Y position

		// Check lines are drawn using elementWriter.js logic: ctx.x + rawWidths[ci] - 0.25
		var call1 = writer.writer.addVector.getCall(0);
		assert.deepStrictEqual(call1.args[0], {
			type: 'line',
			x1: 40 + 0 - 0.25, // ctx.x + vLines[0] - 0.25 = 39.75
			y1: expectedTopY,
			x2: 40 + 0 - 0.25,
			y2: expectedBottomY,
			lineWidth: 0.5,
			lineColor: '#bbbbbb',
			dash: undefined
		});
		assert.strictEqual(call1.args[1], true, 'ignoreContextX should be true');
		assert.strictEqual(call1.args[2], true, 'ignoreContextY should be true');
		assert.strictEqual(call1.args[4], 0, 'Should draw on current page');

		// Check second vertical line
		var call2 = writer.writer.addVector.getCall(1);
		assert.strictEqual(call2.args[0].x1, 40 + 100 - 0.25); // 139.75
		assert.strictEqual(call2.args[0].y1, expectedTopY);
		assert.strictEqual(call2.args[0].y2, expectedBottomY);
		assert.strictEqual(call2.args[0].lineWidth, 0.5);
		assert.strictEqual(call2.args[0].lineColor, '#bbbbbb');

		// Check third vertical line
		var call3 = writer.writer.addVector.getCall(2);
		assert.strictEqual(call3.args[0].x1, 40 + 200 - 0.25); // 239.75

		// Check fourth vertical line (rightmost border)
		var call4 = writer.writer.addVector.getCall(3);
		assert.strictEqual(call4.args[0].x1, 40 + 300 - 0.25); // 339.75

		// Should have moved to next page
		assert.strictEqual(writer.moveToNextPage.callCount, 1);

		// vLines should NOT be cleared - they will be reused on next page
		assert.strictEqual(fragment._footerGapOption.columns.content.vLines.length, 4);

		// addFragment should only be called once (the initial attempt with isFooter=1)
		// The retry with isFooter=2 would be handled by the caller (layoutBuilder)
		assert.strictEqual(writer.writer.addFragment.callCount, 1);
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
					includeOuter: true,
					style: {
						lineWidth: 2,
						color: '#d5d5d5',
						dash: { length: 3, space: 2 }
					},
					content: {
						vLines: [0, 150]
					}
				}
			}
		};

		writer.addFragment(fragment, false, false, false, 1);

		// Should draw two vectors with custom style from columns.style (2 vertical + 1 horizontal)
		assert.strictEqual(writer.writer.addVector.callCount, 3);
		
		var vectorArgs1 = writer.writer.addVector.getCall(0).args[0];
		assert.strictEqual(vectorArgs1.lineWidth, 2);
		assert.strictEqual(vectorArgs1.lineColor, '#d5d5d5');
		assert.deepStrictEqual(vectorArgs1.dash, { length: 3, space: 2 });
		
		var vectorArgs2 = writer.writer.addVector.getCall(1).args[0];
		assert.strictEqual(vectorArgs2.lineWidth, 2);
		assert.strictEqual(vectorArgs2.lineColor, '#d5d5d5');
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
			columns: {
				includeOuter: true,
				style: {
					lineWidth: 0.5,
					color: '#ff0000'
				},
				content: {
					vLines: [0, 120, 240]
				}
			}
		};

		writer.addFragment(fragment, false, false, false, 1);

		// Should draw vectors from context._footerGapOption (3 vertical + 1 horizontal)
		assert.strictEqual(writer.writer.addVector.callCount, 4);
		
		var call1 = writer.writer.addVector.getCall(0);
		assert.strictEqual(call1.args[0].x1, 40 + 0 - 0.25); // ctx.x + vLines[0] - 0.25
		assert.strictEqual(call1.args[0].lineColor, '#ff0000');
		assert.strictEqual(call1.args[0].lineWidth, 0.5);
		
		var call2 = writer.writer.addVector.getCall(1);
		assert.strictEqual(call2.args[0].x1, 40 + 120 - 0.25);
		
		var call3 = writer.writer.addVector.getCall(2);
		assert.strictEqual(call3.args[0].x1, 40 + 240 - 0.25);
	});

	it('should respect includeOuter flag when drawing vertical lines', function () {
		var fragment = {
			height: 150,
			items: [],
			_footerGapOption: {
				enabled: true,
				columns: {
					includeOuter: false, // Exclude outer borders
					style: {
						lineWidth: 0.5,
						color: '#000000'
					},
					content: {
						vLines: [0, 100, 200, 300, 400] // 5 positions
					}
				}
			}
		};

		writer.addFragment(fragment, false, false, false, 1);

		// With includeOuter=false, should skip first and last: draw indices 1-3 (3 vertical) + 1 horizontal
		assert.strictEqual(writer.writer.addVector.callCount, 4, 'Should draw 3 middle lines + 1 horizontal');
		
		// Should draw lines at positions 1, 2, 3 (skipping 0 and 4)
		var call1 = writer.writer.addVector.getCall(0);
		assert.strictEqual(call1.args[0].x1, 40 + 100 - 0.25);
		
		var call2 = writer.writer.addVector.getCall(1);
		assert.strictEqual(call2.args[0].x1, 40 + 200 - 0.25);
		
		var call3 = writer.writer.addVector.getCall(2);
		assert.strictEqual(call3.args[0].x1, 40 + 300 - 0.25);
	});

	it('should default to includeOuter=true when not specified', function () {
		var fragment = {
			height: 150,
			items: [],
			_footerGapOption: {
				enabled: true,
				columns: {
					// includeOuter not specified - should default to true
					style: {
						lineWidth: 0.5,
						color: '#000000'
					},
					content: {
						vLines: [0, 100, 200]
					}
				}
			}
		};

		writer.addFragment(fragment, false, false, false, 1);

		// Should draw all 3 vertical lines + 1 horizontal line
		assert.strictEqual(writer.writer.addVector.callCount, 4);
	});
});

describe('PageElementWriter - Footer Horizontal Lines on Page Break', function () {
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
				columns: {
					widthLength: 3,
					includeOuter: true,
					style: {
						lineWidth: 0.5,
						color: '#bbbbbb'
					},
					content: {
						vLines: [0, 100, 200, 300], // Four vertical line positions (including borders)
						vLineWidths: [0.5, 0.5, 0.5, 0.5]
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

	it('should draw horizontal line at page bottom when footer breaks to new page', function () {
		// Create a footer fragment
		var fragment = {
			height: 150, // Too tall to fit in remaining space
			items: [],
			_footerGapOption: {
				enabled: true,
				columns: {
					widthLength: 3,
					includeOuter: true,
					style: {
						lineWidth: 0.5,
						color: '#bbbbbb'
					},
					content: {
						vLines: [0, 100, 200, 300], // Collected X positions
						vLineWidths: [0.5, 0.5, 0.5, 0.5]
					}
				}
			}
		};

		// Call addFragment with isFooter=1 (first attempt)
		var result = writer.addFragment(fragment, false, false, false, 1);

		// Should return false (footer didn't fit, drew lines, moved to next page)
		assert.strictEqual(result, false);

		// Should have called addVector for both vertical lines (4) and horizontal line (1)
		assert.strictEqual(writer.writer.addVector.callCount, 5, 'Should draw 4 vertical lines + 1 horizontal line');

		// The last call should be the horizontal line
		var hLineCall = writer.writer.addVector.getCall(4);
		
		// Verify horizontal line was drawn correctly
		var expectedBottomY = 842 - 40; // pageHeight - bottomMargin = 802
		var expectedX1 = 40 + 0 - 0.25; // ctx.x + vLines[0] - 0.25 = 39.75 (first position)
		var expectedX2 = 40 + 300 - 0.25; // ctx.x + vLines[3] - 0.25 = 339.75 (last position)

		assert.deepStrictEqual(hLineCall.args[0], {
			type: 'line',
			x1: expectedX1,
			y1: expectedBottomY,
			x2: expectedX2,
			y2: expectedBottomY,
			lineWidth: 0.5,
			lineColor: '#bbbbbb',
			dash: undefined
		});
		assert.strictEqual(hLineCall.args[1], true, 'ignoreContextX should be true');
		assert.strictEqual(hLineCall.args[2], true, 'ignoreContextY should be true');
		assert.strictEqual(hLineCall.args[4], 0, 'Should draw on current page');

		// Should have moved to next page
		assert.strictEqual(writer.moveToNextPage.callCount, 1);
	});

	it('should not draw horizontal line when _footerGapOption is not enabled', function () {
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

		// Should not draw any vectors (neither vertical nor horizontal)
		assert.strictEqual(writer.writer.addVector.callCount, 0);

		// Should still move to next page
		assert.strictEqual(writer.moveToNextPage.callCount, 1);
	});

	it('should not draw horizontal line when vLines array is empty', function () {
		var fragment = {
			height: 150,
			items: [],
			_footerGapOption: {
				enabled: true,
				columns: {
					style: {
						lineWidth: 1,
						color: 'black'
					},
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

	it('should use custom line width and color for horizontal line from footerGapOption', function () {
		var fragment = {
			height: 150,
			items: [],
			_footerGapOption: {
				enabled: true,
				columns: {
					includeOuter: true,
					style: {
						lineWidth: 2,
						color: '#d5d5d5',
						dash: { length: 3, space: 2 }
					},
					content: {
						vLines: [0, 150, 300]
					}
				}
			}
		};

		writer.addFragment(fragment, false, false, false, 1);

		// Should draw 3 vertical lines + 1 horizontal line = 4 vectors
		assert.strictEqual(writer.writer.addVector.callCount, 4);
		
		// Last call should be horizontal line with custom style
		var hLineCall = writer.writer.addVector.getCall(3);
		var vectorArgs = hLineCall.args[0];
		
		assert.strictEqual(vectorArgs.lineWidth, 2);
		assert.strictEqual(vectorArgs.lineColor, '#d5d5d5');
		assert.deepStrictEqual(vectorArgs.dash, { length: 3, space: 2 });
		
		// Verify it's a horizontal line (y1 === y2)
		assert.strictEqual(vectorArgs.y1, vectorArgs.y2);
		
		// Verify it spans from first to last vLine position
		var expectedX1 = 40 + 0 - 0.25; // 39.75
		var expectedX2 = 40 + 300 - 0.25; // 339.75
		assert.strictEqual(vectorArgs.x1, expectedX1);
		assert.strictEqual(vectorArgs.x2, expectedX2);
	});

	it('should draw horizontal line at correct page bottom position', function () {
		var fragment = {
			height: 150,
			items: [],
			_footerGapOption: {
				enabled: true,
				columns: {
					includeOuter: true,
					style: {
						lineWidth: 0.5,
						color: '#000000'
					},
					content: {
						vLines: [0, 200]
					}
				}
			}
		};

		writer.addFragment(fragment, false, false, false, 1);

		// Last call should be the horizontal line
		var hLineCall = writer.writer.addVector.getCall(2);
		var vectorArgs = hLineCall.args[0];
		
		// Calculate expected bottom Y position
		var expectedY = 842 - 40; // pageHeight - bottomMargin = 802
		
		// Verify horizontal line is at page bottom
		assert.strictEqual(vectorArgs.y1, expectedY);
		assert.strictEqual(vectorArgs.y2, expectedY);
		
		// Verify it's horizontal (x1 !== x2)
		assert.notStrictEqual(vectorArgs.x1, vectorArgs.x2);
	});

	it('should fall back to context._footerGapOption for horizontal line if fragment does not have it', function () {
		var fragment = {
			height: 150,
			items: []
			// No _footerGapOption on fragment
		};

		// Context has _footerGapOption
		context._footerGapOption = {
			enabled: true,
			columns: {
				includeOuter: true,
				style: {
					lineWidth: 0.5,
					color: '#ff0000'
				},
				content: {
					vLines: [0, 120, 240]
				}
			}
		};

		writer.addFragment(fragment, false, false, false, 1);

		// Should draw 3 vertical lines + 1 horizontal line = 4 vectors
		assert.strictEqual(writer.writer.addVector.callCount, 4);
		
		// Last call should be horizontal line from context config
		var hLineCall = writer.writer.addVector.getCall(3);
		var vectorArgs = hLineCall.args[0];
		
		assert.strictEqual(vectorArgs.lineColor, '#ff0000');
		assert.strictEqual(vectorArgs.lineWidth, 0.5);
		
		// Verify span from first to last vLine
		var expectedX1 = 40 + 0 - 0.25;
		var expectedX2 = 40 + 240 - 0.25;
		assert.strictEqual(vectorArgs.x1, expectedX1);
		assert.strictEqual(vectorArgs.x2, expectedX2);
	});

	it('should draw horizontal line spanning full table width regardless of includeOuter setting', function () {
		// Test with includeOuter=false
		var fragment = {
			height: 150,
			items: [],
			_footerGapOption: {
				enabled: true,
				columns: {
					includeOuter: false, // Exclude outer borders for vertical lines
					style: {
						lineWidth: 0.5,
						color: '#000000'
					},
					content: {
						vLines: [0, 100, 200, 300, 400] // 5 positions
					}
				}
			}
		};

		writer.addFragment(fragment, false, false, false, 1);

		// Should draw 3 vertical lines (middle only) + 1 horizontal line = 4 vectors
		assert.strictEqual(writer.writer.addVector.callCount, 4);
		
		// Last call should be horizontal line
		var hLineCall = writer.writer.addVector.getCall(3);
		var vectorArgs = hLineCall.args[0];
		
		// Horizontal line should still span from first to last position (full width)
		var expectedX1 = 40 + 0 - 0.25;
		var expectedX2 = 40 + 400 - 0.25;
		assert.strictEqual(vectorArgs.x1, expectedX1);
		assert.strictEqual(vectorArgs.x2, expectedX2);
		
		// Verify it's horizontal
		assert.strictEqual(vectorArgs.y1, vectorArgs.y2);
	});
});
