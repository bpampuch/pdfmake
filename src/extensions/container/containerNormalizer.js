
/**
 * @mixin
 */
const ContainerNormalizer = Base => class extends Base {

	constructor() {
		super();

		this.registerNode(
			node => node.stack,
			node => node.normalizeVerticalContainer(node)
		);
	}

	normalizeVerticalContainer(node) {
		if (isArray(node)) { // stack defined as array
			node = { stack: node };
		}

		let items = node.stack;

		for (let i = 0, l = items.length; i < l; i++) {
			items[i] = this.normalizeNode(items[i]);
		}

		return node;
	}
};

export default ContainerNormalizer;
