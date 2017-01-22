/* jslint node: true */
'use strict';

var assert = require('assert');
var _ = require('lodash');
var sinon = require('sinon');
var TableProcessor = require('../src/tableProcessor');

describe('TableProcessor', function () {

	var defaultLayout, contextFake, writerFake;

	beforeEach(function () {
		defaultLayout = {
			hLineWidth: function (i, node) {
				return 1;
			},
			vLineWidth: function (i, node) {
				return 1;
			},
			hLineColor: function (i, node) {
				return 'black';
			},
			vLineColor: function (i, node) {
				return 'black';
			},
			paddingLeft: function (i, node) {
				return 4;
			},
			paddingRight: function (i, node) {
				return 4;
			},
			paddingTop: function (i, node) {
				return 2;
			},
			paddingBottom: function (i, node) {
				return 2;
			},
			fillColor: function (i, node) {
				return null;
			},
			defaultBorder: true
		};

		contextFake = {
			moveDown: _.noop
		};

		writerFake = {
			context: function () {
				return contextFake;
			},
			addVector: function (vector, ignoreContextX, ignoreContextY, index) {
				assert.equal(vector.lineColor, 'nice shiny color');
				addVectorCallCount++;
			},
			tracker: {
				startTracking: _.noop,
				stopTracking: _.noop
			}
		};

	});


	it('should use the line colors function (regression #161)', function () {

		var addVectorCallCount = 0;

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
		processor.rowSpanData = [{left: 0, rowSpan: 0}, {left: 0, rowSpan: 0}];

		processor.beginRow(0, writerFake);
		processor.endRow(0, writerFake, []);

		assert.equal(addVectorCallCount, 3);
	});

	it('should use the line colors constants (regression #161)', function () {

		var addVectorCallCount = 0;

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
		processor.rowSpanData = [{left: 0, rowSpan: 0}, {left: 0, rowSpan: 0}];

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
						widths: [{width: '*'}]
					},
					_offsets: {
						total: 56472
					},
					_layout: {
						paddingLeft: _.noop,
						paddingRight: _.noop,
						paddingBottom: _.noop,
						paddingTop: _.noop,
						vLineWidth: _.noop,
						hLineWidth: _.noop,
						fillColor: _.noop
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
						moveDown: _.noop
					};
				},
				repeatables: [],
				tracker: {
					stopTracking: _.noop
				},
				addVector: _.noop,
				popFromRepeatables: sinon.spy(),
				pushToRepeatables: function (repeatable) {
					assert.equal(repeatable, header);
				},
				beginUnbreakableBlock: _.noop,
				currentBlockToRepeatable: function () {
					return header;
				},
				commitUnbreakableBlock: _.noop
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
