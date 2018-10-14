import { isArray } from '../../helpers/variableType';

/**
 * @mixin
 */
const ContainerNormalizer = Base => class extends Base {

	constructor() {
		super();

		this.registerCleanup(
			node => this.cleanupVerticalContainer(node)
		);

		this.registerNodeType(
			node => node.stack,
			node => this.normalizeVerticalContainer(node)
		);
	}

	cleanupVerticalContainer(node) {
		if (isArray(node)) { // stack defined as array
			node = { stack: node };
		}

		return node;
	}

	normalizeVerticalContainer(node) {
		let items = node.stack;

		for (let i = 0, l = items.length; i < l; i++) {
			items[i] = this.normalizeNode(items[i]);
		}

		return node;
	}
};

export default ContainerNormalizer;
