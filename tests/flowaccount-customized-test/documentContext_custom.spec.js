'use strict';

var assert = require('assert');

var DocumentContext = require('../../src/documentContext');

describe('FlowAccount DocumentContext safeguards', function () {
	var pageSize = { width: 600, height: 800 };
	var margins = { left: 40, right: 40, top: 50, bottom: 60 };

	it('stores footer gap option from constructor', function () {
		var option = { enabled: true, columns: { content: { vLines: [0, 100] } } };
		var ctx = new DocumentContext(pageSize, margins, option);

		assert.strictEqual(ctx._footerGapOption, option);
	});

	it('updateBottomByPage returns early when no snapshots exist', function () {
		var ctx = new DocumentContext(pageSize, margins);

		assert.doesNotThrow(function () {
			ctx.updateBottomByPage();
		});
	});

	it('updateBottomByPage creates snapshot map when missing', function () {
		var ctx = new DocumentContext(pageSize, margins);

		ctx.beginColumnGroup();
		var snapshot = ctx.snapshots[ctx.snapshots.length - 1];
		snapshot.bottomByPage = undefined;

		ctx.updateBottomByPage();

		assert.ok(snapshot.bottomByPage, 'bottomByPage map initialized');
		assert.strictEqual(snapshot.bottomByPage[ctx.page], ctx.y, 'snapshot stores current y position');
	});

	it('calculateBottomMost tolerates null destination context', function () {
		var ctx = new DocumentContext(pageSize, margins);

		ctx.beginColumnGroup();
		var snapshot = ctx.snapshots[ctx.snapshots.length - 1];
		snapshot.bottomMost = null;

		ctx.calculateBottomMost(snapshot);

		assert.ok(snapshot.bottomMost, 'bottomMost populated after calculation');
		assert.strictEqual(snapshot.bottomMost.page, ctx.page, 'bottomMost page matches current page');
	});
});
