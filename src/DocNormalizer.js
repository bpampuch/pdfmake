import { stringifyNode } from './helpers/node';

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
		node = this.processAllWithoutCondition(this.shortcuts, node);
		node = this.processFirst(this.nodeTypes, node);
		node = this.processAll(this.properties, node);

		return node;
	}

	/**
	 * Process all items with condition
	 *
	 * @param {Array} items
	 * @param {object} node
	 * @return {object}
	 */
	processAll(items, node) {
		for (let item of items) {
			if (item.condition(node)) {
				node = item.callback(node);
			}
		}

		return node;
	}

	/**
	 * Process all items without condition
	 *
	 * @param {Array} items
	 * @param {object} node
	 * @return {object}
	 */
	processAllWithoutCondition(items, node) {
		for (let item of items) {
			node = item.callback(node);
		}

		return node;
	}

	/**
	 * Process only first item with condition
	 *
	 * @param {Array} items
	 * @param {object} node
	 * @return {object}
	 */
	processFirst(items, node) {
		for (let item of items) {
			if (item.condition(node)) {
				node = item.callback(node);
				return node;
			}
		}

		throw 'Unrecognized document structure: ' + stringifyNode(node);
	}

}

export default DocNormalizer;
