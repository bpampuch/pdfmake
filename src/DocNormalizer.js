class DocNormalizer {

	constructor() {
		this.cleanups = [];
		this.nodeTypes = [];
		this.properties = [];
	}

	registerCleanup(callback) {
		this.cleanups.push({
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
		for (let cleanup of this.cleanups) {
			node = cleanup.callback(node);
		}

		for (let nodeType of this.nodeTypes) {
			if (nodeType.condition(node)) { // only first match
				node = nodeType.callback(node);
				break;
			}
		}

		for (let property of this.properties) {
			if (property.condition(node)) { // all matches
				node = property.callback(node);
			}
		}

		return node;
	}

}

export default DocNormalizer;
