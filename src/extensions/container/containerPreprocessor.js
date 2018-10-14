/**
 * @mixin
 */
const ContainerPreprocessor = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'stack' in node,
			node => this.preprocessVerticalContainer(node)
		);
	}

	preprocessVerticalContainer(node) {
		let items = node.stack;

		for (let i = 0, l = items.length; i < l; i++) {
			items[i] = this.preprocessNode(items[i]);
		}

		return node;
	}
};

export default ContainerPreprocessor;
