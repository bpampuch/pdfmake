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
		for (let shortcut of this.shortcuts) {
			node = shortcut.callback(node);
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
