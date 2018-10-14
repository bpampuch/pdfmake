class DocNormalizer {

	constructor() {
		this.nodes = [];
		this.properties = [];
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
		this.nodes.forEach((nodeExtension) => {
			if (nodeExtension.condition(node)) { // only first match
				node = nodeExtension.callback(node);
				//				break;  TODO break
			}
		});

		this.properties.forEach((nodeExtension) => {
			if (nodeExtension.condition(node)) { // all matches
				node = nodeExtension.callback(node);
			}
		});

		return node;
	}

}

export default DocNormalizer;
