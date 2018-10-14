/**
 * @mixin
 */
const ContainerProcessor = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'stack' in node,
			node => this.processVerticalContainer(node)
		);
	}

	processVerticalContainer(node) {
		let items = node.stack;

		for (let i = 0, l = items.length; i < l; i++) {
			items[i] = this.processNode(items[i]);
		}

		return node;
	}
};

export default ContainerProcessor;
