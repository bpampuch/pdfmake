'use strict';

var assert = require('assert');
var sinon = require('sinon');
var TableProcessor = require('../../js/TableProcessor').default;

describe('TableProcessor', function () {

	var defaultLayout, addVectorCallCount, contextFake, writerFake;

	beforeEach(function () {
		defaultLayout = {
			hLineWidth: function (i, node) { // eslint-disable-line no-unused-vars
				return 1;
			},
			vLineWidth: function (i, node) { // eslint-disable-line no-unused-vars
				return 1;
			},
			hLineColor: function (i, node) { // eslint-disable-line no-unused-vars
				return 'black';
			},
			vLineColor: function (i, node) { // eslint-disable-line no-unused-vars
				return 'black';
			},
			hLineStyle: function (i, node) { // eslint-disable-line no-unused-vars
				return null;
			},
			vLineStyle: function (i, node) { // eslint-disable-line no-unused-vars
				return null;
			},
			paddingLeft: function (i, node) { // eslint-disable-line no-unused-vars
				return 4;
			},
			paddingRight: function (i, node) { // eslint-disable-line no-unused-vars
				return 4;
			},
			paddingTop: function (i, node) { // eslint-disable-line no-unused-vars
				return 2;
			},
			paddingBottom: function (i, node) { // eslint-disable-line no-unused-vars
				return 2;
			},
			fillColor: function (i, node) { // eslint-disable-line no-unused-vars
				return null;
			},
			fillOpacity: function (i, node) { // eslint-disable-line no-unused-vars
				return 1;
			},
			defaultBorder: true
		};

		addVectorCallCount = 0;

		contextFake = {
			moveDown: function () { }
		};

		writerFake = {
			context: function () {
				return contextFake;
			},
			addVector: function (vector, ignoreContextX, ignoreContextY, index) { // eslint-disable-line no-unused-vars
				assert.equal(vector.lineColor, 'nice shiny color');
				addVectorCallCount++;
			},
			addListener: function () { },
			removeListener: function () { }
		};

	});


	it('should use the line colors function (regression #161)', function () {
		writerFake.addVector = function (vector) {
			assert.equal(vector.lineColor, 'nice shiny color');
			addVectorCallCount++;
		};


		var tableNode = {
			table: {
				body: [
					['A1', 'A2'],
					['B1', 'B2']
				]
			}
		};

		var processor = new TableProcessor(tableNode);
		defaultLayout.vLineColor = function () {
			return 'nice shiny color';
		};
		defaultLayout.hLineColor = function () {
			return 'nice shiny color';
		};
		processor.layout = defaultLayout;
		processor.rowSpanData = [{ left: 0, rowSpan: 0 }, { left: 0, rowSpan: 0 }];

		processor.beginRow(0, writerFake);
		processor.endRow(0, writerFake, []);

		assert.equal(addVectorCallCount, 3);
	});

	it('should use the line colors constants (regression #161)', function () {
		writerFake.addVector = function (vector) {
			assert.equal(vector.lineColor, 'nice shiny color');
			addVectorCallCount++;
		};


		var tableNode = {
			table: {
				body: [
					['A1', 'A2'],
					['B1', 'B2']
				]
			}
		};

		var processor = new TableProcessor(tableNode);
		defaultLayout.vLineColor = 'nice shiny color';
		defaultLayout.hLineColor = 'nice shiny color';
		processor.layout = defaultLayout;
		processor.rowSpanData = [{ left: 0, rowSpan: 0 }, { left: 0, rowSpan: 0 }];

		processor.beginRow(0, writerFake);
		processor.endRow(0, writerFake, []);

		assert.equal(addVectorCallCount, 3);
	});

	describe('header with nested table (issue #199)', function () {
		it('should not remove the repeatable of the outer table when nested table ends', function () {

			var fakeTableNode = function () {
				return {
					table: {
						// since extendTableWidths is not called from out tests
						// we can't use the doc-definition syntax for widths
						// so instead of '*' we
						widths: [{ width: '*' }]
					},
					_offsets: {
						total: 56472
					},
					_layout: {
						paddingLeft: function () { },
						paddingRight: function () { },
						paddingBottom: function () { },
						paddingTop: function () { },
						vLineWidth: function () { },
						hLineWidth: function () { },
						fillColor: function () { },
						fillOpacity: function () { }
					}
				};
			};

			var header = {};

			var nestedTableNode = fakeTableNode();
			nestedTableNode.table.body = [['nested table cell']];

			var tableNode = fakeTableNode();
			tableNode.table.body = [
				['Header'],
				[nestedTableNode]
			];
			tableNode.table.headerRows = 1;

			var fakeWriter = {
				context: function () {
					return {
						availableWidth: 56473,
						moveDown: function () { }
					};
				},
				repeatables: [],
				removeListener: function () { },
				addVector: function () { },
				popFromRepeatables: sinon.spy(),
				pushToRepeatables: function (repeatable) {
					assert.equal(repeatable, header);
				},
				beginUnbreakableBlock: function () { },
				currentBlockToRepeatable: function () {
					return header;
				},
				commitUnbreakableBlock: function () { }
			};

			var pageBreaks = [];
			var tableProcessor = new TableProcessor(tableNode);
			tableProcessor.beginTable(fakeWriter);
			tableProcessor.endRow(0, fakeWriter, pageBreaks);

			var nestedTableProcessor = new TableProcessor(nestedTableNode);
			nestedTableProcessor.beginTable(fakeWriter);
			nestedTableProcessor.endRow(0, fakeWriter, pageBreaks);
			nestedTableProcessor.endTable(fakeWriter);
			assert.equal(fakeWriter.popFromRepeatables.callCount, 0);

			tableProcessor.endTable(fakeWriter);
			assert.equal(fakeWriter.popFromRepeatables.callCount, 1);
		});
	});
});
