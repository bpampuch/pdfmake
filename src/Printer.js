import { isString, isBoolean, isArray, isNumber, isValue } from './helpers/variableType';
import PDFDocument from './PDFDocument';
import pageSizes from './standardPageSizes';
import defaults from './defaults';

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

		docDefinition.pageMargins = getPageMargins(docDefinition.pageMargins) || defaults.pageMargins;
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

		console.log(docDefinition);
		console.log(pages);

		// TODO
	}
}

export default Printer;
