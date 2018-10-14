/**
 * @mixin
 */
const ReferenceNormalizer = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerProperty(
			node => 'id' in node,
			node => this.normalizeReferenceId(node)
		);

		this.registerNodeType(
			node => 'pageReference' in node,
			node => this.normalizePageReference(node)
		);

		this.registerNodeType(
			node => 'textReference' in node,
			node => this.normalizeTextReference(node)
		);
	}

	normalizeReferenceId(node) {
		return node;
	}

	normalizePageReference(node) {
		return node;
	}

	normalizeTextReference(node) {
		return node;
	}

};

export default ReferenceNormalizer;
