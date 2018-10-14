import { stringifyNode } from './node';

/**
 * Process all extenstions by condition
 *
 * @param {Array} items
 * @param {object} node
 * @return {object}
 */
export function processAllExtenstionsByCondition(extensions, node) {
	for (let extension of extensions) {
		if (extension.condition(node)) {
			node = extension.callback(node);
		}
	}

	return node;
}

/**
 * Process all extenstions
 *
 * @param {Array} items
 * @param {object} node
 * @return {object}
 */
export function processAllExtenstions(extensions, node) {
	for (let extension of extensions) {
		node = extension.callback(node);
	}

	return node;
}

/**
 * Process first extenstions by condition
 *
 * @param {Array} items
 * @param {object} node
 * @return {object}
 */
export function processFirstExtenstionsByCondition(extensions, node) {
	for (let extension of extensions) {
		if (extension.condition(node)) {
			node = extension.callback(node);
			return node;
		}
	}

	throw 'Unrecognized document structure: ' + stringifyNode(node);
}
