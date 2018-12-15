/**
 * @mixin
 */
const ListPreprocessor = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'ul' in node,
			node => this.preprocessList(node)
		);

		this.registerNodeType(
			node => 'ol' in node,
			node => this.preprocessList(node)
		);
	}

	preprocessList(node) {
		let items = node.ul || node.ol;

		for (let i = 0, l = items.length; i < l; i++) {
			items[i] = this.preprocessNode(items[i]);
		}

		return node;
	}
};

export default ListPreprocessor;
