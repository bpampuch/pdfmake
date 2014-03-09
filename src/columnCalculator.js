/* jslint node: true */
'use strict';

/**
* Calculates column widths
* @private
*/
module.exports = {
	buildColumnWidths: function(columns, availableWidth) {
		var autoColumns = [],
			autoMin = 0, autoMax = 0,
			starColumns = [],
			starMaxMin = 0,
			starMaxMax = 0,
			fixedColumns = [];

		columns.forEach(function(column) {
			if (isAutoColumn(column)) {
				autoColumns.push(column);
				autoMin += column._minWidth;
				autoMax += column._maxWidth;
			} else if (isStarColumn(column)) {
				starColumns.push(column);
				starMaxMin = Math.max(starMaxMin, column._minWidth);
				starMaxMax = Math.max(starMaxMax, column._maxWidth);
			} else {
				fixedColumns.push(column);
			}
		});

		fixedColumns.forEach(function(col) {
			if (col.width < (col._minWidth) && col.elasticWidth) {
				col._calcWidth = col._minWidth;
			} else {
				col._calcWidth = col.width;
			}

			availableWidth -= col._calcWidth;
		});

		// http://www.freesoft.org/CIE/RFC/1942/18.htm
		// http://www.w3.org/TR/CSS2/tables.html#width-layout
		// http://dev.w3.org/csswg/css3-tables-algorithms/Overview.src.htm
		var minW = autoMin + starMaxMin * starColumns.length;
		var maxW = autoMax + starMaxMax * starColumns.length;
		if (minW >= availableWidth) {
			// case 1 - there's no way to fit all columns within available width
			// that's actually pretty bad situation with PDF as we have no horizontal scroll
			// no easy workaround (unless we decide, in the future, to split single words)
			// currently we simply use minWidths for all columns
			autoColumns.forEach(function(col) {
				col._calcWidth = col._minWidth;
			});

			starColumns.forEach(function(col) {
				col._calcWidth = starMaxMin; // starMaxMin already contains padding
			});
		} else {
			if (maxW < availableWidth) {
				// case 2 - we can fit rest of the table within available space
				autoColumns.forEach(function(col) {
					col._calcWidth = col._maxWidth;
					availableWidth -= col._calcWidth;
				});
			} else {
				// maxW is too large, but minW fits within available width
				var W = availableWidth - minW;
				var D = maxW - minW;

				autoColumns.forEach(function(col) {
					var d = col._maxWidth - col._minWidth;
					col._calcWidth = col._minWidth + d * W / D;
					availableWidth -= col._calcWidth;
				});
			}

			if (starColumns.length > 0) {
				var starSize = availableWidth / starColumns.length;

				starColumns.forEach(function(col) {
					col._calcWidth = starSize;
				});
			}
		}

		function isAutoColumn(column) {
			return column.width === 'auto';
		}

		function isStarColumn(column) {
			return column.width === null || column.width === undefined || column.width === '*' || column.width === 'star';
		}
	}
};
