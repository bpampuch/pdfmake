import { addAll } from '../../helpers/tools';

/**
 * @mixin
 */
const ContainerBuilder = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'stack' in node,
			node => this.buildVerticalContainer(node)
		);
	}

	buildVerticalContainer(node) {
		node.stack.forEach(function (item) {
			self.buildNode(item);
			addAll(node.positions, item.positions);

			//TODO: paragraph gap
		}, this);

	}
};

export default ContainerBuilder;
