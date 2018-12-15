/**
 * @mixin
 */
const ListBuilder = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'ul' in node,
			node => this.buildUnorderedList(node)
		);

		this.registerNodeType(
			node => 'ol' in node,
			node => this.buildOrderedList(node)
		);
	}

	buildUnorderedList(node) {
		// TODO
	}

	measureOrderedList(node) {
		// TODO
	}
};

export default ListBuilder;
