import { isString, isBoolean, isArray, isNumber, isValue, isFunction } from './helpers/variableType';
import PDFDocument from './PDFDocument';
import pageSizes from './standardPageSizes';
import defaults from './defaults';
import LayoutBuilder from './LayoutBuilder';
import Renderer from './Renderer';

const getPageSize = (pageSize, pageOrientation) => {
	const isNeedSwapPageSizes = pageOrientation => {
		if (isString(pageOrientation)) {
			pageOrientation = pageOrientation.toLowerCase();
			return ((pageOrientation === 'portrait') && (size.width > size.height)) ||
				((pageOrientation === 'landscape') && (size.width < size.height));
		}
		return false;
	};

	const pageSizeToWithAndHeight = pageSize => {
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

const getPageMargins = margin => {
	if (!margin) {
		return null;
	}

	if (isNumber(margin)) {
		margin = { left: margin, right: margin, top: margin, bottom: margin };
	} else if (isArray(margin)) {
		if (margin.length === 2) {
			margin = { left: margin[0], top: margin[1], right: margin[0], bottom: margin[1] };
		} else if (margin.length === 4) {
			margin = { left: margin[0], top: margin[1], right: margin[2], bottom: margin[3] };
		} else {
			throw 'Invalid pageMargins definition';
		}
	}

	return margin;
};

const calculatePageHeight = (pages, margins) => {
	const getItemHeight = item => {
		if (isFunction(item.item.getHeight)) {
			return item.item.getHeight();
		} else if (item.item._height) {
			return item.item._height;
		} else {
			// TODO: add support for next item types
			// TODO: Throw error?
			return 0;
		}
	};

	const getBottomPosition = item => {
		let top = item.item.y;
		let height = getItemHeight(item);
		return top + height;
	};

	let height = margins.top;

	pages.forEach(page => {
		page.items.forEach(item => {
			let bottomPosition = getBottomPosition(item);
			if (bottomPosition > height) {
				height = bottomPosition;
			}
		});
	});

	height += margins.bottom;

	return height;
};

const setMetadata = (docDefinition, pdfDocument) => {
	// PDF standard has these properties reserved: Title, Author, Subject, Keywords,
	// Creator, Producer, CreationDate, ModDate, Trapped.
	// To keep the pdfmake api consistent, the info field are defined lowercase.
	// Custom properties don't contain a space.
	function standardizePropertyKey(key) {
		let standardProperties = ['Title', 'Author', 'Subject', 'Keywords',
			'Creator', 'Producer', 'CreationDate', 'ModDate', 'Trapped'];
		let standardizedKey = key.charAt(0).toUpperCase() + key.slice(1);
		if (standardProperties.indexOf(standardizedKey) !== -1) {
			return standardizedKey;
		}

		return key.replace(/\s+/g, '');
	}

	pdfDocument.info.Producer = 'pdfmake';
	pdfDocument.info.Creator = 'pdfmake';

	if (docDefinition.info) {
		for (let key in docDefinition.info) {
			let value = docDefinition.info[key];
			if (value) {
				key = standardizePropertyKey(key);
				pdfDocument.info[key] = value;
			}
		}
	}
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

		docDefinition.pageMargins = getPageMargins(docDefinition.pageMargins || defaults.pageMargins);
		docDefinition.images = docDefinition.images || {};
		docDefinition.styles = docDefinition.styles || {};
		docDefinition.defaultStyle = docDefinition.defaultStyle || { font: defaults.font, fontSize: defaults.fontSize };

		let pageSize = getPageSize(docDefinition.pageSize, docDefinition.pageOrientation);
		let pdfOptions = {
			size: [pageSize.width, pageSize.height],
			compress: docDefinition.compress,
			bufferPages: options.bufferPages || defaults.bufferPages,
			autoFirstPage: false
		};

		this.pdfDocument = new PDFDocument(this.fonts, docDefinition.images, pdfOptions);
		setMetadata(docDefinition, this.pdfDocument);

		let builder = new LayoutBuilder(this.pdfDocument, pageSize, docDefinition.pageMargins);
		let pages = builder.buildDocument(docDefinition);

		let maxNumberPages = docDefinition.maxPagesNumber || -1;
		if (isNumber(maxNumberPages) && maxNumberPages > -1) {
			pages = pages.slice(0, maxNumberPages);
		}

		// if pageSize.height is set to Infinity, calculate the actual height of the page that
		// was laid out using the height of each of the items in the page.
		if (pageSize.height === Infinity) {
			let pageHeight = calculatePageHeight(pages, docDefinition.pageMargins);
			this.pdfDocument.options.size = [pageSize.width, pageHeight];
		}

		let renderer = new Renderer(this.pdfDocument, options.progressCallback);
		renderer.renderPages(pages);

		return this.pdfDocument;
	}
}

export default Printer;
