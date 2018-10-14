/**
 * @mixin
 */
const CanvasBuilder = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'canvas' in node,
			node => this.buildCanvas(node)
		);
	}

	buildCanvas(node) {
		this.writer.addCanvas(node);
	}

};

export default CanvasBuilder;
