/**
 * @mixin
 */
const CanvasProcessor = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'canvas' in node,
			node => this.processCanvas(node)
		);
	}

	processCanvas(node) {
		return node;
	}

};

export default CanvasProcessor;
