import { processAllExtenstionsByCondition, processFirstExtenstionsByCondition } from './helpers/extensionsRunner';

class DocPreprocessor {

	constructor() {
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

	preprocessDocument(docStructure) {
		return this.preprocessNode(docStructure);
	}

	preprocessNode(node) {
		node = processAllExtenstionsByCondition(this.properties, node);
		node = processFirstExtenstionsByCondition(this.nodeTypes, node);

		return node;
	}

}

export default DocPreprocessor;
