import { processAllExtenstionsByCondition, processFirstExtenstionsByCondition } from './helpers/extensionsRunner';
import PageElementWriter from './PageElementWriter';
import DocumentContext from './DocumentContext';

const decorateNode = (node) => {
	let x = node.x;
	let y = node.y;

	node.positions = [];

	node.resetXY = () => {
		node.x = x;
		node.y = y;
	};

	// TODO: canvas
};

class LayoutBuilder {

	constructor(pdfDocument, pageSize, pageMargins) {
		this.pdfDocument = pdfDocument;
		this.pageSize = pageSize;
		this.pageMargins = pageMargins;
		this.nodeTypes = [];
		this.properties = [];
	}

	registerNodeType(condition, callback) {
		this.nodeTypes.push({
			condition: condition,
			callback: callback
		});
	}

	registerProperty(condition, callback) {
		this.properties.push({
			condition: condition,
			callback: callback
		});
	}

	buildDocument(docStructure, styleDictionary, defaultStyle) {
		// TODO
		return this.tryLayoutDocument(docStructure);
	}

	tryLayoutDocument(docStructure) {
		this.writer = new PageElementWriter(new DocumentContext(this.pageSize, this.pageMargins));

		this.buildNode(docStructure);

		//TODO

		return this.writer.context.pages; // TODO
	}

	buildNode(node) {
		decorateNode(node);

		let margin = node._margin;

		if (node.pageBreak === 'before') {
			this.writer.moveToNextPage(node.pageOrientation);
		}

		if (margin) {
			this.writer.context.moveDown(margin[1]);
			this.writer.context.addMargin(margin[0], margin[2]);
		}

		let unbreakable = node.unbreakable;
		if (unbreakable) {
			this.writer.beginUnbreakableBlock();
		}

		let absolutePosition = node.absolutePosition;
		if (absolutePosition) {
			this.writer.context.beginDetachedBlock();
			this.writer.context.moveTo(absolutePosition.x || 0, absolutePosition.y || 0);
		}

		let relativePosition = node.relativePosition;
		if (relativePosition) {
			this.writer.context.beginDetachedBlock();
			this.writer.context.moveTo((relativePosition.x || 0) + this.writer.context().x, (relativePosition.y || 0) + this.writer.context().y);
		}

		processFirstExtenstionsByCondition(this.nodeTypes, node);
		processAllExtenstionsByCondition(this.properties, node);

		if (absolutePosition || relativePosition) {
			this.writer.context.endDetachedBlock();
		}

		if (unbreakable) {
			this.writer.commitUnbreakableBlock();
		}

		if (margin) {
			this.writer.context.addMargin(-margin[0], -margin[2]);
			this.writer.context.moveDown(margin[3]);
		}

		if (node.pageBreak === 'after') {
			this.writer.moveToNextPage(node.pageOrientation);
		}

		return node;
	}

}

export default LayoutBuilder;
