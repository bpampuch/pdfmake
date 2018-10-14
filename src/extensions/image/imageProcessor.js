/**
 * @mixin
 */
const ImageProcessor = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'image' in node,
			node => this.processImage(node)
		);
	}

	processImage(node) {
		return node;
	}

};

export default ImageProcessor;
