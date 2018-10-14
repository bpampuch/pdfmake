/**
 * @mixin
 */
const CanvasNormalizer = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'canvas' in node,
			node => this.normalizeCanvas(node)
		);
	}

	normalizeCanvas(node) {
		return node;
	}

};

export default CanvasNormalizer;
