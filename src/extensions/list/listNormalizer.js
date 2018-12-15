/**
 * @mixin
 */
const ListNormalizer = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'ul' in node,
			node => this.normalizeList(node)
		);

		this.registerNodeType(
			node => 'ol' in node,
			node => this.normalizeList(node)
		);
	}

	normalizeList(node) {
		let items = node.ul || node.ol;

		for (let i = 0, l = items.length; i < l; i++) {
			items[i] = this.normalizeNode(items[i]);
		}

		return node;
	}
};

export default ListNormalizer;
