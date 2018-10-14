import { processAllExtenstionsByCondition, processFirstExtenstionsByCondition } from './helpers/extensionsRunner';
import PageElementWriter from './PageElementWriter';
import DocumentContext from './DocumentContext';

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

	tryLayoutDocument() {
		// TODO
		this.writer = new PageElementWriter(new DocumentContext(this.pageSize, this.pageMargins));
		// TODO
	}

	buildNode(node) {
		node = processFirstExtenstionsByCondition(this.nodeTypes, node);
		node = processAllExtenstionsByCondition(this.properties, node);

		return node;
	}

}

export default LayoutBuilder;
