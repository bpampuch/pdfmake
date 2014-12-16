/* jslint node: true */
'use strict';

function buildColumnWidths(columns, availableWidth) {
	var autoColumns = [],
		autoMin = 0, autoMax = 0,
		starColumns = [],
		starMaxMin = 0,
		starMaxMax = 0,
		fixedColumns = [],
		initial_availableWidth = availableWidth;

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
		// width specified as %
		if (typeof col.width === 'string' && /\d+%/.test(col.width) ) {
			col.width = parseFloat(col.width)*initial_availableWidth/100;
		}
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
}

function isAutoColumn(column) {
	return column.width === 'auto';
}

function isStarColumn(column) {
	return column.width === null || column.width === undefined || column.width === '*' || column.width === 'star';
}

//TODO: refactor and reuse in measureTable
function measureMinMax(columns) {
	var result = { min: 0, max: 0 };

	var maxStar = { min: 0, max: 0 };
	var starCount = 0;

	for(var i = 0, l = columns.length; i < l; i++) {
		var c = columns[i];

		if (isStarColumn(c)) {
			maxStar.min = Math.max(maxStar.min, c._minWidth);
			maxStar.max = Math.max(maxStar.max, c._maxWidth);
			starCount++;
		} else if (isAutoColumn(c)) {
			result.min += c._minWidth;
			result.max += c._maxWidth;
		} else {
			result.min += ((c.width !== undefined && c.width) || c._minWidth);
			result.max += ((c.width  !== undefined && c.width) || c._maxWidth);
		}
	}

	if (starCount) {
		result.min += starCount * maxStar.min;
		result.max += starCount * maxStar.max;
	}

	return result;
}

/**
* Calculates column widths
* @private
*/
module.exports = {
	buildColumnWidths: buildColumnWidths,
	measureMinMax: measureMinMax,
	isAutoColumn: isAutoColumn,
	isStarColumn: isStarColumn
};
