/**
 * @mixin
 */
const ReferenceProcessor = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerProperty(
			node => 'id' in node,
			node => this.processReferenceId(node)
		);

		this.registerProperty(
			node => '_pageRef' in node,
			node => this.processPageReference(node)
		);

		this.registerProperty(
			node => '_textRef' in node,
			node => this.processTextReference(node)
		);
	}

	processReferenceId(node) {
		return node;
	}

	processPageReference(node) {
		return node;
	}

	processTextReference(node) {
		if (node._textRef._textNodeRef.text) {
			node.text = node._textRef._textNodeRef.text;
		}

		return node;
	}

};

export default ReferenceProcessor;
