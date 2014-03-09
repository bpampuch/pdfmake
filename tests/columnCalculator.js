var assert = require('assert');

var ColumnCalculator = require('../src/columnCalculator');

describe('ColumnCalculator', function(){
	describe('buildColumnWidths', function() {
		it('should set calcWidth to specified width for fixed columns', function() {
			var columns = [
				{ width: 50, _minWidth: 30, _maxWidth: 80 },
				{ width: 35, _minWidth: 30, _maxWidth: 80 },
				{ width: 20, _minWidth: 30, _maxWidth: 80 }
			];

			ColumnCalculator.buildColumnWidths(columns, 320);

			columns.forEach(function(col) {
				assert.equal(col._calcWidth, col.width);
			});
		});

		it('should set calcWidth to minWidth for fixed columns with elasticWidth set to true', function() {
			var columns = [
				{ width: 50, _minWidth: 30, _maxWidth: 80 },
				{ width: 35, _minWidth: 30, _maxWidth: 80 },
				{ width: 20, _minWidth: 30, _maxWidth: 80, elasticWidth: true }
			];

			ColumnCalculator.buildColumnWidths(columns, 320);

			assert.equal(columns[0]._calcWidth, columns[0].width);
			assert.equal(columns[1]._calcWidth, columns[1].width);
			assert.equal(columns[2]._calcWidth, columns[2]._minWidth);
		});

		it('should set auto to maxWidth if there is enough space for all columns', function() {
			var columns = [
				{ width: 'auto', _minWidth: 30, _maxWidth: 41 },
				{ width: 'auto', _minWidth: 30, _maxWidth: 42 },
				{ width: 'auto', _minWidth: 30, _maxWidth: 43 }
			];

			ColumnCalculator.buildColumnWidths(columns, 320);

			columns.forEach(function(col) {
				assert.equal(col._calcWidth, col._maxWidth);
			});
		});

		it('should equally divide availableSpace to star columns', function() {
			var columns = [
				{ width: '*', _minWidth: 30, _maxWidth: 41 },
				{ width: 'star', _minWidth: 30, _maxWidth: 42 },
				{ _minWidth: 30, _maxWidth: 43 }
			];

			ColumnCalculator.buildColumnWidths(columns, 320);

			columns.forEach(function(col) {
				assert.equal(col._calcWidth, 320/3);
			});
		});

		it('should set calcWidth to minWidth if there is not enough space for the table', function() {
			var columns = [
				{ width: 'auto', _minWidth: 300, _maxWidth: 410 },
				{ width: 'auto', _minWidth: 301, _maxWidth: 420 },
				{ width: 'auto', _minWidth: 303, _maxWidth: 421 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);

			columns.forEach(function(col) {
				assert.equal(col._calcWidth, col._minWidth);
			});
		});

		it('should set calcWidth of star columns to largest star min-width if there is not enough space for the table', function() {
			var columns = [
				{ width: 'auto', _minWidth: 300, _maxWidth: 410 },
				{ width: '*', _minWidth: 301, _maxWidth: 420 },
				{ width: 'star', _minWidth: 303, _maxWidth: 421 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);
			assert.equal(columns[0]._calcWidth, columns[0]._minWidth);
			assert.equal(columns[1]._calcWidth, 303);
			assert.equal(columns[2]._calcWidth, 303);
		});

		it('should make columns wider proportionally if table can fit within the available space', function() {
			var columns = [
				{ width: 'auto', _minWidth: 30, _maxWidth: 41 },
				{ width: 'auto', _minWidth: 31, _maxWidth: 42 },
				{ width: 'auto', _minWidth: 33, _maxWidth: 421 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);
			assert(columns[0]._calcWidth > 30);
			assert(columns[1]._calcWidth > 31);
			assert(columns[2]._calcWidth > 220);
		});

		it('should first take into account auto columns and then divide remaining space equally between all star if there is enough space for the table', function() {
			var columns = [
				{ width: '*', _minWidth: 30, _maxWidth: 41 },
				{ width: 'auto', _minWidth: 31, _maxWidth: 42 },
				{ width: '*', _minWidth: 33, _maxWidth: 421 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);
			assert(columns[1]._calcWidth > 31);
			assert.equal(columns[0]._calcWidth, columns[0]._calcWidth);
			assert.equal(columns[0]._calcWidth + columns[1]._calcWidth + columns[2]._calcWidth, 320);
		});
	});
});
