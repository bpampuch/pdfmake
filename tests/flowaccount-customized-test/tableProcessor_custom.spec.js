'use strict';

var assert = require('assert');
var sinon = require('sinon');

var TableProcessor = require('../../src/tableProcessor');

function createLayout(overrides) {
	var base = {
		paddingLeft: function () { return 0; },
		paddingRight: function () { return 0; },
		paddingTop: function () { return 0; },
		paddingBottom: function () { return 0; },
		vLineWidth: function () { return 1; },
		vLineStyle: function () { return null; },
		vLineColor: '#000000',
		hLineWidth: function () { return 1; },
		hLineStyle: function () { return null; },
		hLineColor: '#000000',
		fillColor: null,
		fillOpacity: 1,
		defaultBorder: true
	};

	return Object.assign({}, base, overrides || {});
}

function createTableNode(options) {
	options = options || {};

	var widths = options.widths || [
		{ width: 120, _calcWidth: 120, _minWidth: 120, _maxWidth: 120 },
		{ width: 80, _calcWidth: 80, _minWidth: 80, _maxWidth: 80 }
	];
	var body = options.body || [[
		{ border: [true, true, true, true] },
		{ border: [true, true, true, true] }
	]];

	return {
		table: {
			widths: widths,
			body: body,
			dontBreakRows: options.dontBreakRows || false
		},
		_layout: options.layout || createLayout(),
		_offsets: { total: 0, left: 0 },
		remark: options.remark,
		footerGapCollect: options.footerGapCollect
	};
}

function createContext(overrides) {
	var page = { items: [], pageSize: { width: 400, height: 600 } };
	var ctx = {
		x: 0,
		y: 0,
		page: 0,
		availableWidth: 500,
		availableHeight: 400,
		backgroundLength: [0],
		moveDown: function (offset) {
			this.y += offset;
			this.availableHeight -= offset;
		},
		getCurrentPage: function () {
			return overrides && overrides.page ? overrides.page : page;
		}
	};

	return Object.assign(ctx, overrides || {});
}

describe('FlowAccount TableProcessor adjustments', function () {
	it('collects footer gap column guides when enabled for product items', function () {
		var tableNode = createTableNode({ footerGapCollect: 'product-items' });
		var processor = new TableProcessor(tableNode);
		processor.layout = tableNode._layout;

		var ctx = createContext({
			x: 15,
			_footerGapOption: {
				enabled: true,
				columns: {
					widthLength: 2
				}
			}
		});
		var writer = {
			context: function () { return ctx; },
			addVector: sinon.spy()
		};

		processor.drawVerticalLine(0, 0, 40, 0, writer, 0, 0);
		processor.drawVerticalLine(120, 0, 40, 1, writer, 0, 0);

		var content = ctx._footerGapOption.columns.content;
		assert.ok(content, 'content metadata created');
		assert.deepStrictEqual(content.vLines, [15, 135], 'stores absolute x positions for footer reconstruction');
	});

	it('does not collect footer columns when footerGapCollect flag is absent', function () {
		var tableNode = createTableNode();
		var processor = new TableProcessor(tableNode);
		processor.layout = tableNode._layout;

		var ctx = createContext({
			x: 5,
			_footerGapOption: {
				enabled: true,
				columns: {}
			}
		});
		var writer = {
			context: function () { return ctx; },
			addVector: sinon.spy()
		};

		processor.drawVerticalLine(0, 0, 40, 0, writer, 0, 0);

		assert.ok(!ctx._footerGapOption.columns.content, 'no column capture when collect flag missing');
	});

	it('marks remark table header lines during row breaks', function () {
		var tableNode = createTableNode({ remark: true });
		var processor = new TableProcessor(tableNode);
		processor.rowPaddingTop = 5;
		processor.topLineWidth = 2;
		processor.headerRows = 0;
		processor.reservedAtBottom = 3;

		var page = { items: [{ item: { remark: true } }] };
		var moveDown = sinon.spy(function (offset) {
			ctx.y += offset;
			ctx.availableHeight -= offset;
		});
		var ctx = createContext({
			availableHeight: 100,
			y: 0,
			moveDown: moveDown,
			getCurrentPage: function () { return page; }
		});
		var writer = {
			context: function () { return ctx; }
		};

		var handler = processor.onRowBreak(0, writer);
		handler();

		assert.strictEqual(page.items[0].item.lineColor, '#d5d5d5', 'remark rows gain adjusted border color');
		assert.strictEqual(ctx.availableHeight, 90, 'available height reduced by reserved space and offset');
		assert.strictEqual(moveDown.calledOnce, true, 'row break invokes moveDown once');
		assert.strictEqual(moveDown.firstCall.args[0], 7, 'row break accounts for top padding and border');
	});

	it('propagates remark flag into horizontal table vectors', function () {
		var remarkMarker = { type: 'remark' };
		var tableNode = createTableNode({ remark: remarkMarker });
		var processor = new TableProcessor(tableNode);

		var vectors = [];
		var ctx = createContext({ availableHeight: 300, availableWidth: 400, y: 40, backgroundLength: [0] });
		var writer = {
			context: function () { return ctx; },
			tracker: { startTracking: sinon.spy(), stopTracking: sinon.spy() },
			beginUnbreakableBlock: sinon.spy(),
			addVector: function (vector) {
				vectors.push(vector);
				return vector;
			}
		};

		processor.beginTable(writer);
		processor.drawHorizontalLine(0, writer, undefined, false);

		assert.ok(vectors.length > 0, 'horizontal line vectors generated');
		assert(vectors.some(function (vector) {
			return vector.remark === remarkMarker;
		}), 'horizontal line vector carries remark marker for downstream styling');
	});
});
