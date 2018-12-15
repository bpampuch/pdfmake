/**
 * @mixin
 */
const ListProcessor = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'ul' in node,
			node => this.processList(node)
		);

		this.registerNodeType(
			node => 'ol' in node,
			node => this.processList(node)
		);
	}

	processList(node) {
		let items = node.ul || node.ol;

		for (let i = 0, l = items.length; i < l; i++) {
			items[i] = this.processNode(items[i]);
		}

		return node;
	}
};

export default ListProcessor;
