import PageElementWriter from './PageElementWriter';
import DocumentContext from './DocumentContext';

import mixin from './helpers/mixin';

import DocNormalizer from './DocNormalizer';
import ContainerNormalizer from './extensions/container/containerNormalizer';
import TextNormalizer from './extensions/text/textNormalizer';
import ReferenceNormalizer from './extensions/reference/referenceNormalizer';
import ImageNormalizer from './extensions/image/imageNormalizer';
import CanvasNormalizer from './extensions/canvas/canvasNormalizer';

import DocPreprocessor from './DocPreprocessor';
import ContainerPreprocessor from './extensions/container/containerPreprocessor';
import TextPreprocessor from './extensions/text/textPreprocessor';
import ReferencePreprocessor from './extensions/reference/referencePreprocessor';
import ImagePreprocessor from './extensions/image/imagePreprocessor';
import CanvasPreprocessor from './extensions/canvas/canvasPreprocessor';

import DocProcessor from './DocProcessor';
import ContainerProcessor from './extensions/container/containerProcessor';
import TextProcessor from './extensions/text/textProcessor';
import ReferenceProcessor from './extensions/reference/referenceProcessor';
import ImageProcessor from './extensions/image/imageProcessor';
import CanvasProcessor from './extensions/canvas/canvasProcessor';

import DocMeasurer from './DocMeasurer';
import ContainerMeasurer from './extensions/container/containerMeasurer';
import TextMeasurer from './extensions/text/textMeasurer';
import ImageMeasurer from './extensions/image/imageMeasurer';
import CanvasMeasurer from './extensions/canvas/canvasMeasurer';

import DocBuilder from './DocBuilder';
import ContainerBuilder from './extensions/container/containerBuilder';
import TextBuilder from './extensions/text/textBuilder';
import ImageBuilder from './extensions/image/imageBuilder';
import CanvasBuilder from './extensions/canvas/canvasBuilder';

class LayoutBuilder {

	constructor(pdfDocument, pageSize, pageMargins) {
		this.pdfDocument = pdfDocument;
		this.pageSize = pageSize;
		this.pageMargins = pageMargins;
	}

	buildDocument(docDefinition) {
		// TODO: refactor creating extended classes
		const DocNormalizerClass = mixin(DocNormalizer).with(ContainerNormalizer, TextNormalizer, ReferenceNormalizer, ImageNormalizer, CanvasNormalizer);
		const DocPreprocessorClass = mixin(DocPreprocessor).with(ContainerPreprocessor, TextPreprocessor, ReferencePreprocessor, ImagePreprocessor, CanvasPreprocessor);
		const DocProcessorClass = mixin(DocProcessor).with(ContainerProcessor, TextProcessor, ReferenceProcessor, ImageProcessor, CanvasProcessor);
		const DocMeasurerClass = mixin(DocMeasurer).with(ContainerMeasurer, TextMeasurer, ImageMeasurer, CanvasMeasurer);

		let normalizer = new DocNormalizerClass();
		docDefinition.content = normalizer.normalizeDocument(docDefinition.content);

		let preprocessor = new DocPreprocessorClass();
		docDefinition.content = preprocessor.preprocessDocument(docDefinition.content);

		let processor = new DocProcessorClass();
		docDefinition.content = processor.processDocument(docDefinition.content);

		let measurer = new DocMeasurerClass(this.pdfDocument, docDefinition.styles, docDefinition.defaultStyle);
		docDefinition.content = measurer.measureDocument(docDefinition.content);

		// TODO

		return this._tryLayoutDocument(docDefinition);
	}

	_tryLayoutDocument(docDefinition) {
		this.writer = new PageElementWriter(new DocumentContext(this.pageSize, this.pageMargins));

		// TODO: refactor creating extended classes
		const DocBuilderClass = mixin(DocBuilder).with(ContainerBuilder, TextBuilder, ImageBuilder, CanvasBuilder);

		let builder = new DocBuilderClass(this.pdfDocument, this.writer);
		builder.buildDocument(docDefinition.content, docDefinition.styles, docDefinition.defaultStyle);

		//TODO

		return this.writer.context.pages; // TODO
	}

}

export default LayoutBuilder;
