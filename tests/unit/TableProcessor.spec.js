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

	describe('headerRows and keepWithHeaderRows (issue #2754)', function () {
		var fakeWriter = {
			context: function () {
				return {
					availableWidth: 56473,
				};
			},
			beginUnbreakableBlock: function () { },
		};

		const inputTable = {
			table: {
				widths: [{ width: 20 }, { width: 20 }],
				body: [['a', 'b'], ['c', 'd'], ['e', 'f']]
			},
			_offsets: {
				total: 9
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

		it('should ignore wrong values for headerRows - 1', function () {
			inputTable.table.headerRows = '2';
			inputTable.table.keepWithHeaderRows = 2;

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () { };
			tableProcessor.beginTable(fakeWriter);
			assert.equal(tableProcessor.headerRows, 0);
			assert.equal(tableProcessor.rowsWithoutPageBreak, 0);
		});

		it('should ignore wrong values for headerRows - 2', function () {
			inputTable.table.headerRows = -5;
			inputTable.table.keepWithHeaderRows = 2;

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () { };
			tableProcessor.beginTable(fakeWriter);
			assert.equal(tableProcessor.headerRows, 0);
			assert.equal(tableProcessor.rowsWithoutPageBreak, 0);
		});


		it('should ignore wrong values for headerRows - 3', function () {
			inputTable.table.headerRows = 2.5;
			inputTable.table.keepWithHeaderRows = 2;

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () { };
			tableProcessor.beginTable(fakeWriter);
			assert.equal(tableProcessor.headerRows, 0);
			assert.equal(tableProcessor.rowsWithoutPageBreak, 0);
		});

		it('should ignore keepWithHeaderRows if headerRows is not bigger than 0', function () {
			inputTable.table.headerRows = 0;
			inputTable.table.keepWithHeaderRows = 2;

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () { };
			tableProcessor.beginTable(fakeWriter);
			assert.equal(tableProcessor.headerRows, 0);
			assert.equal(tableProcessor.rowsWithoutPageBreak, 0);
		});

		it('should ignore wrong values for keepWithHeaderRows - 1', function () {
			inputTable.table.headerRows = 1;
			inputTable.table.keepWithHeaderRows = 1.5;

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () { };
			tableProcessor.beginTable(fakeWriter);
			assert.equal(tableProcessor.headerRows, 1);
			assert.equal(tableProcessor.rowsWithoutPageBreak, 1);
		});

		it('should ignore wrong values for keepWithHeaderRows - 2', function () {
			inputTable.table.headerRows = 2;
			inputTable.table.keepWithHeaderRows = '1.5';

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () { };
			tableProcessor.beginTable(fakeWriter);
			assert.equal(tableProcessor.headerRows, 2);
			assert.equal(tableProcessor.rowsWithoutPageBreak, 2);
		});

		it('should sum up headerRows and keepWithHeaderRows - 1', function () {
			inputTable.table.headerRows = 1;
			inputTable.table.keepWithHeaderRows = 2;

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () { };
			tableProcessor.beginTable(fakeWriter);
			assert.equal(tableProcessor.rowsWithoutPageBreak, 3);
			assert.equal(tableProcessor.headerRows, 1);
		});

		it('should sum up headerRows and keepWithHeaderRows - 2', function () {
			inputTable.table.headerRows = 1;
			inputTable.table.keepWithHeaderRows = 0;

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () { };
			tableProcessor.beginTable(fakeWriter);
			assert.equal(tableProcessor.rowsWithoutPageBreak, 1);
			assert.equal(tableProcessor.headerRows, 1);
		});

		it('should throw exception when headerRows > table rows', function () {
			inputTable.table.headerRows = 5;
			inputTable.table.keepWithHeaderRows = 0;

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () { };
			assert.throws(() => tableProcessor.beginTable(fakeWriter), /Too few rows in the table/);
		});
	});
});
