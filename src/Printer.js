import { isString, isBoolean, isArray, isNumber, isValue } from './helpers/variableType';
import PDFDocument from './PDFDocument';
import pageSizes from './standardPageSizes';
import defaults from './defaults';
import Renderer from './Renderer';

import mixin from './helpers/mixin';

import DocNormalizer from './DocNormalizer';
import ContainerNormalizer from './extensions/container/containerNormalizer';
import TextNormalizer from './extensions/text/textNormalizer';

import DocPreprocessor from './DocPreprocessor';
import ContainerPreprocessor from './extensions/container/containerPreprocessor';
import TextPreprocessor from './extensions/text/textPreprocessor';

import DocMeasurer from './DocMeasurer';
import ContainerMeasurer from './extensions/container/containerMeasurer';
import TextMeasurer from './extensions/text/textMeasurer';

import LayoutBuilder from './LayoutBuilder';
import ContainerBuilder from './extensions/container/containerBuilder';
import TextBuilder from './extensions/text/textBuilder';

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

const getPageMargins = function (margin) {
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

const calculatePageHeight = function (pages, margins) {
	const getItemHeight = function (item) {
		if (isFunction(item.item.getHeight)) {
			return item.item.getHeight();
		} else if (item.item._height) {
			return item.item._height;
		} else {
			// TODO: add support for next item types
			// TODO: Throw error?
			return 0;
		}
	}

	const getBottomPosition = function (item) {
		let top = item.item.y;
		let height = getItemHeight(item);
		return top + height;
	}

	let height = margins.top;

	pages.forEach(function (page) {
		page.items.forEach(function (item) {
			let bottomPosition = getBottomPosition(item);
			if (bottomPosition > height) {
				height = bottomPosition;
			}
		});
	});

	height += margins.bottom;

	return height;
};

const setMetadata = function (docDefinition, pdfDocument) {
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
}


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

		// TODO: refactor creating extended classes
		const DocNormalizerClass = mixin(DocNormalizer).with(ContainerNormalizer, TextNormalizer);
		const DocPreprocessorClass = mixin(DocPreprocessor).with(ContainerPreprocessor, TextPreprocessor);
		const DocMeasurerClass = mixin(DocMeasurer).with(ContainerMeasurer, TextMeasurer);
		const LayoutBuilderClass = mixin(LayoutBuilder).with(ContainerBuilder, TextBuilder);

		let normalizer = new DocNormalizerClass();
		docDefinition.content = normalizer.normalizeDocument(docDefinition.content);

		let preprocessor = new DocPreprocessorClass();
		docDefinition.content = preprocessor.preprocessDocument(docDefinition.content);

		let measurer = new DocMeasurerClass(this.pdfDocument, docDefinition.styles, docDefinition.defaultStyle);
		docDefinition.content = measurer.measureDocument(docDefinition.content);

		let builder = new LayoutBuilderClass(this.pdfDocument, pageSize, docDefinition.pageMargins);
		let pages = builder.buildDocument(docDefinition.content, docDefinition.styles, docDefinition.defaultStyle);

		// if pageSize.height is set to Infinity, calculate the actual height of the page that
		// was laid out using the height of each of the items in the page.
		if (pageSize.height === Infinity) {
			let pageHeight = calculatePageHeight(pages, docDefinition.pageMargins);
			this.pdfDocument.options.size = [pageSize.width, pageHeight];
		}

		let renderer = new Renderer(this.pdfDocument);
		renderer.renderPages(pages);

		//		console.log(docDefinition);
		//		console.log(pages);
		// TODO

		return this.pdfDocument;
	}
}

export default Printer;
