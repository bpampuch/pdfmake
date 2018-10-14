/**
 * @mixin
 */
const ImagePreprocessor = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'image' in node,
			node => this.preprocessImage(node)
		);
	}

	preprocessImage(node) {
		return node;
	}

};

export default ImagePreprocessor;
