import { processAllExtenstionsByCondition, processFirstExtenstionsByCondition } from './helpers/extensionsRunner';
import PageElementWriter from './PageElementWriter';
import DocumentContext from './DocumentContext';

const decorateNode = (node) => {
	node.positions = [];
	// TODO
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

		node = processFirstExtenstionsByCondition(this.nodeTypes, node);
		node = processAllExtenstionsByCondition(this.properties, node);

		return node;
	}

}

export default LayoutBuilder;
