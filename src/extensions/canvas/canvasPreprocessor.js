/**
 * @mixin
 */
const CanvasPreprocessor = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'canvas' in node,
			node => this.preprocessCanvas(node)
		);
	}

	preprocessCanvas(node) {
		return node;
	}

};

export default CanvasPreprocessor;
