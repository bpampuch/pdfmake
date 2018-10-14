import { processAllExtenstionsByCondition, processFirstExtenstionsByCondition } from './helpers/extensionsRunner';

class DocProcessor {

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

	processDocument(docStructure) {
		return this.processNode(docStructure);
	}

	processNode(node) {
		node = processFirstExtenstionsByCondition(this.nodeTypes, node);
		node = processAllExtenstionsByCondition(this.properties, node);

		return node;
	}

}

export default DocProcessor;
