import { processAllExtenstionsByCondition, processFirstExtenstionsByCondition } from './helpers/extensionsRunner';

class LayoutBuilder {

	constructor(pdfDocument) {
		this.pdfDocument = pdfDocument;
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

	buildNode(node) {
		node = processFirstExtenstionsByCondition(this.nodeTypes, node);
		node = processAllExtenstionsByCondition(this.properties, node);

		return node;
	}

}

export default LayoutBuilder;
