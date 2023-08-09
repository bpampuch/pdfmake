import sizes from './standardPageSizes';
import { isString, isNumber } from './helpers/variableType';

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

	return margin;
}
