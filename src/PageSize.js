import sizes from './standardPageSizes';
import { isString, isNumber, isFunction, isObject, isValue } from './helpers/variableType';

export function normalizePageSize(pageSize, pageOrientation) {
	function isNeedSwapPageSizes(pageOrientation) {
		if (isString(pageOrientation)) {
			pageOrientation = pageOrientation.toLowerCase();
			return ((pageOrientation === 'portrait') && (size.width > size.height)) ||
				((pageOrientation === 'landscape') && (size.width < size.height));
		}
		return false;
	}

	function pageSizeToWidthAndHeight(pageSize) {
		if (isString(pageSize)) {
			let size = sizes[pageSize.toUpperCase()];
			if (!size) {
				throw new Error(`Page size ${pageSize} not recognized`);
			}
			return { width: size[0], height: size[1] };
		}

		return pageSize;
	}

	// if pageSize.height is set to auto, set the height to infinity so there are no page breaks.
	if (pageSize && pageSize.height === 'auto') {
		pageSize.height = Infinity;
	}

	let size = pageSizeToWidthAndHeight(pageSize || 'A4');
	if (isNeedSwapPageSizes(pageOrientation)) { // swap page sizes
		size = { width: size.height, height: size.width };
	}
	size.orientation = size.width > size.height ? 'landscape' : 'portrait';
	return size;
}

function isPageMarginObject(margin) {
	if (isObject(margin)) {
		const { left, top, right, bottom } = margin;

		if (isValue(left) && isValue(top) && isValue(right) && isValue(bottom)) {
			return true;
		}
	}
	return false;
}


/*
 * Accepts margin definition as being:
 *   * a number to set same margin size on all margins
 *   * a function which will receive pageNumber as argument
 *   * an array with two numbers to set horizontal and vertical margin respectively
 *   * an array with four numbers to set left, top, right and bottom margin respectively
 *
 * Normalized value is an object with the four margins as property.
 * */
export function normalizePageMargin(margin) {
	if (isNumber(margin)) {
		margin = { left: margin, right: margin, top: margin, bottom: margin };
	} else if (Array.isArray(margin)) {
		if (margin.length === 2) {
			margin = { left: margin[0], top: margin[1], right: margin[0], bottom: margin[1] };
		} else if (margin.length === 4) {
			margin = { left: margin[0], top: margin[1], right: margin[2], bottom: margin[3] };
		} else {
			throw new Error('Invalid pageMargins definition');
		}
	}

	if (!isFunction(margin) && !isPageMarginObject(margin)) {
		throw new Error('Invalid pageMargins definition');
	}

	return margin;
}

/*
 * Returns a function accepting pageNumber as argument and returning
 * a normalized page margin object
 * */
export function functionalizePageMargin(margin) {
	let marginFn;
	if (isFunction(margin)) {
		marginFn = function (pageNumber) {
			return normalizePageMargin(margin(pageNumber));
		};
	} else {
		if (!isPageMarginObject(margin)) {
			margin = normalizePageMargin(margin);
		}

		const { left, top, right, bottom } = margin;
		marginFn = function () {
			return {
				left,
				top,
				right,
				bottom,
			};
		};

	}

	if (!isFunction(marginFn)) {
		throw new Error(`Unable to functionalize pageMargin: ${margin}`);
	}

	return marginFn;
}
