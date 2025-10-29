'use strict';

var assert = require('assert');

var DocumentContext = require('../../src/documentContext');
var ElementWriter = require('../../src/elementWriter');

function createMockTracker() {
	return {
		emit: function () {}
	};
}

function createSimpleFragment(height) {
	return {
		height: height,
		items: []
	};
}

describe('FlowAccount ElementWriter footer gap handling', function () {
	var pageSize = { width: 500, height: 700 };
	var margins = { left: 40, right: 40, top: 30, bottom: 50 };

	function buildWriter(contextOptions) {
		var ctx = new DocumentContext(pageSize, margins, contextOptions && contextOptions.footerGapOption);
		if (contextOptions && contextOptions.preAdjustY) {
			ctx.y = contextOptions.preAdjustY;
			ctx.availableHeight -= (contextOptions.preAdjustY - margins.top);
		}
		return new ElementWriter(ctx, createMockTracker());
	}

	it('applies footer gaps and draws guide lines', function () {
		var footerOption = {
			enabled: true,
			columns: {
				content: { vLines: [0, 50, 100] }
			}
		};

		var writer = buildWriter({ footerGapOption: footerOption });
		var fragment = createSimpleFragment(40);
		fragment._footerGapOption = footerOption;

		var initialY = writer.context.y;
		writer.addFragment(fragment, true, true, false, true);

		assert.ok(writer.context.y > initialY, 'context moved down to account for footer gap');
		assert.strictEqual(writer.context.y, pageSize.height - margins.bottom, 'footer consumes remaining space on page');
		var pageItems = writer.context.getCurrentPage().items;
		var vectors = pageItems.filter(function (item) {
			return item.type === 'vector' && item.item._footerGuideLine;
		});
		assert.strictEqual(vectors.length, 3, 'guide lines added for each divider');
	});

	it('shifts context to the bottom margin when footer has no gap option', function () {
		var writer = buildWriter();
		var fragment = createSimpleFragment(40);

		var initialY = writer.context.y;
		var initialAvailable = writer.context.availableHeight;
		writer.addFragment(fragment, true, true, false, true);

		var expectedMoveDown = initialAvailable - fragment.height;
		assert.strictEqual(writer.context.y, initialY + expectedMoveDown + fragment.height, 'footer consumes remaining vertical space plus own height');
		assert.strictEqual(writer.context.availableHeight, 0, 'no space left after footer rendering');
	});

	it('pushContext reuses footer gap option for nested fragment', function () {
		var footerOption = { enabled: true };
		var writer = buildWriter({ footerGapOption: footerOption });

		writer.pushContext(200, 300);
		var nestedContext = writer.context;
		assert.strictEqual(nestedContext._footerGapOption, footerOption, 'nested context inherits footer gap option');
		writer.popContext();
	});
});
