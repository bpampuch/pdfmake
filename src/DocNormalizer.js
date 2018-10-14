import { processAllExtenstions, processAllExtenstionsByCondition, processFirstExtenstionsByCondition } from './helpers/extensionsRunner';

class DocNormalizer {

	constructor() {
		this.shortcuts = [];
		this.nodeTypes = [];
		this.properties = [];
	}

	registerShortcut(callback) {
		this.shortcuts.push({
			callback: callback
		});
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

	normalizeDocument(docStructure) {
		return this.normalizeNode(docStructure);
	}

	normalizeNode(node) {
		node = processAllExtenstions(this.shortcuts, node);
		node = processFirstExtenstionsByCondition(this.nodeTypes, node);
		node = processAllExtenstionsByCondition(this.properties, node);

		return node;
	}

}

export default DocNormalizer;
