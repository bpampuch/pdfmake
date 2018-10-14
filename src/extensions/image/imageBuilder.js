/**
 * @mixin
 */
const ImageBuilder = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'image' in node,
			node => this.buildImage(node)
		);
	}

	buildImage(node) {
		let position = this.writer.addImage(node);
		node.positions.push(position);
	}

};

export default ImageBuilder;
