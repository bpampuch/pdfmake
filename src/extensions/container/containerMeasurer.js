/**
 * @mixin
 */
const ContainerMeasurer = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'stack' in node,
			node => this.measureVerticalContainer(node)
		);
	}

	measureVerticalContainer(node) {
		let items = node.stack;

		node._minWidth = 0;
		node._maxWidth = 0;

		for (let i = 0, l = items.length; i < l; i++) {
			items[i] = this.measureNode(items[i]);

			node._minWidth = Math.max(node._minWidth, items[i]._minWidth);
			node._maxWidth = Math.max(node._maxWidth, items[i]._maxWidth);
		}

		return node;
	}
};

export default ContainerMeasurer;
