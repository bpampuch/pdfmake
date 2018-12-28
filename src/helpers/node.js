function fontStringify(key, val) {
	if (key === 'font') {
		return 'font';
	}
	return val;
}

/**
 * Convert node to readable string
 *
 * @param {Object} node
 * @return {string}
 */
export function stringifyNode(node) {
	return JSON.stringify(node, fontStringify);
}
