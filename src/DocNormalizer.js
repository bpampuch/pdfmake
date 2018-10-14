class DocNormalizer {

	constructor() {
		this.cleanups = [];
		this.nodes = [];
		this.properties = [];
	}

	registerCleanup(callback) {
		this.cleanups.push({
			callback: callback
		});
	}

	registerNode(condition, callback) {
		this.nodes.push({
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

		for (let nodeExtension of this.nodes) {
			if (nodeExtension.condition(node)) { // only first match
				node = nodeExtension.callback(node);
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
