import { isString, isBoolean, isValue } from './helpers/variableType';
import PDFDocument from './PDFDocument';
import pageSizes from './standardPageSizes';
import defaults from './defaults';


const getPageSize = function (pageSize, pageOrientation) {
	const isNeedSwapPageSizes = function (pageOrientation) {
		if (isString(pageOrientation)) {
			pageOrientation = pageOrientation.toLowerCase();
			return ((pageOrientation === 'portrait') && (size.width > size.height)) ||
				((pageOrientation === 'landscape') && (size.width < size.height));
		}
		return false;
	};

	const pageSizeToWithAndHeight = function (pageSize) {
		if (isString(pageSize)) {
			let size = pageSizes[pageSize.toUpperCase()];
			if (!size) {
				throw `Page size ${pageSize} not recognized`;
			}
			return { width: size[0], height: size[1] };
		}

		return pageSize;
	};

	// if pageSize.height is set to auto, set the height to infinity so there are no page breaks.
	if (pageSize && pageSize.height === 'auto') {
		pageSize.height = Infinity;
	}

	let size = pageSizeToWithAndHeight(pageSize || defaults.pageSize);
	if (isNeedSwapPageSizes(pageOrientation)) { // swap page sizes
		size = { width: size.height, height: size.width };
	}
	size.orientation = size.width > size.height ? 'landscape' : 'portrait';

	return size;
};

class Printer {

	/**
	 * @param {Object} fonts
	 */
	constructor(fonts) {
		this.fonts = fonts;
	}

	print(docDefinition, options = {}) {
		if (!isValue(docDefinition.compress) || !isBoolean(docDefinition.compress)) {
			docDefinition.compress = defaults.compress;
		}

		docDefinition.images = docDefinition.images || {};

		let pageSize = getPageSize(docDefinition.pageSize, docDefinition.pageOrientation);
		let pdfOptions = {
			size: [pageSize.width, pageSize.height],
			compress: docDefinition.compress,
			bufferPages: options.bufferPages || defaults.bufferPages,
			autoFirstPage: false
		};

		this.pdfDocument = new PDFDocument(this.fonts, docDefinition.images, pdfOptions);

		// TODO
	}
}

export default Printer;
