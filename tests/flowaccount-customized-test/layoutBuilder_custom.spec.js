'use strict';

var assert = require('assert');
var sinon = require('sinon');

var LayoutBuilder = require('../../src/layoutBuilder');
var DocPreprocessor = require('../../src/docPreprocessor');
var DocMeasure = require('../../src/docMeasure');

describe('FlowAccount LayoutBuilder adjustments', function () {
	var sampleFontProvider = {
		provideFont: function (familyName, bold, italics) {
			return {
				widthOfString: function (text, size) {
					return text.length * size * (bold ? 1.5 : 1) * (italics ? 1.1 : 1);
				},
				lineHeight: function (size) {
					return size;
				},
				ascender: 150,
				descender: -50
			};
		}
	};

	var imageMeasure = {
		measureImage: function () {
			return {
				width: 1,
				height: 1
			};
		}
	};

	function createBuilder() {
		return new LayoutBuilder(
			{ width: 400, height: 600, orientation: 'portrait' },
			{ left: 40, right: 40, top: 40, bottom: 40 },
			imageMeasure
		);
	}

	it('collapses FlowAccount remark definition into remark table rows', function () {
		var remarkTable = {
			table: {
				widths: ['*'],
				body: []
			}
		};
		var remarkLabel = { text: 'Remarks', remark: remarkTable };
		var remarkDetail = { text: 'Invoices settled on receipt.' };
		var docDefinition = [
			{ text: 'Header' },
			{ text: 'Body' },
			[remarkLabel, remarkDetail],
			{ text: 'Footer' }
		];

		var builder = createBuilder();
		var capturedDoc;
		var preprocessStub = sinon.stub(DocPreprocessor.prototype, 'preprocessDocument').callsFake(function (doc) {
			capturedDoc = doc;
			return doc;
		});
		var measureStub = sinon.stub(DocMeasure.prototype, 'measureDocument').callsFake(function (doc) {
			return doc;
		});
		var originalProcessNode = builder.processNode;
		builder.processNode = function () { /* no-op for interception */ };

		try {
			builder.layoutDocument(docDefinition, sampleFontProvider, {}, { fontSize: 12 });
		} finally {
			builder.processNode = originalProcessNode;
			measureStub.restore();
			preprocessStub.restore();
		}

		assert.ok(Array.isArray(capturedDoc[2]), 'remark stack kept as array before preprocess');
		assert.strictEqual(capturedDoc[2].length, 1, 'remark stack replaced with single table entry');
		assert.strictEqual(capturedDoc[2][0], remarkTable, 'remark table placed back into structure');
		assert.strictEqual(remarkTable.table.headerRows, 1, 'remark table now advertises a header row');
		assert.strictEqual(capturedDoc[2].indexOf(remarkDetail), -1, 'remark detail node removed from original stack');

		var tableBody = remarkTable.table.body;
		assert.ok(Array.isArray(tableBody), 'remark table body stays as array');
		assert.ok(tableBody.length >= 2, 'remark table gained label and detail rows');

		var hasLabelRow = tableBody.some(function (row) {
			return row && row[0] === remarkLabel;
		});
		assert.ok(hasLabelRow, 'remark label moved into first appended row');

		var detailCell = null;
		tableBody.forEach(function (row) {
			if (row && row[0] && row[0].remarktest) {
				detailCell = row[0];
			}
		});

		assert.ok(detailCell, 'remark detail row appended with remarktest flag');
		assert.strictEqual(detailCell.text, 'Invoices settled on receipt.', 'detail row retains original remark text');
	});

	it('applies footer gap option while isolating caller input state', function () {
		var builder = createBuilder();
		var option = {
			enabled: true,
			columns: {
				widths: [100, 80],
				stops: [50, 150],
				style: { alignment: 'center', bold: true },
				includeOuter: false
			}
		};

		var widthsRef = option.columns.widths;
		var stopsRef = option.columns.stops;
		var styleRef = option.columns.style;

		builder.applyFooterGapOption(option);

		// Mutate original objects to ensure LayoutBuilder keeps defensive copies
		widthsRef.push(999);
		stopsRef[0] = 999;
		styleRef.bold = false;
		option.enabled = false;

		builder.layoutDocument([{ text: 'content' }], sampleFontProvider, {}, { fontSize: 12 });

		var ctxOption = builder.writer.context()._footerGapOption;

		assert.ok(ctxOption.enabled, 'stored option remains enabled regardless of caller mutation');
		assert.strictEqual(ctxOption, builder._footerGapOption, 'context shares sanitized footer gap option');
		assert.deepStrictEqual(ctxOption.columns.widths, [100, 80], 'column widths stored as independent copy');
		assert.deepStrictEqual(ctxOption.columns.stops, [50, 150], 'column stops stored as independent copy');
		assert.deepStrictEqual(ctxOption.columns.style, { alignment: 'center', bold: true }, 'column style stored as independent copy');
		assert.strictEqual(ctxOption.columns.widthLength, 2, 'column width length captured from original input');
		assert.strictEqual(ctxOption.columns.includeOuter, false, 'includeOuter flag preserved');
	});
});
