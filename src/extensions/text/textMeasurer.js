/**
 * @mixin
 */
const TextMeasurer = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'text' in node,
			node => this.measureText(node)
		);
	}

	measureText(node) {
		// Make sure style properties of the node itself are considered when building inlines.
		// We could also just pass [node] to buildInlines, but that fails for bullet points.
		var styleStack = this.styleStack.clone();
		styleStack.push(node);

		var data = this.textInlines.buildInlines(node.text, styleStack);

		node._inlines = data.items;
		node._minWidth = data.minWidth;
		node._maxWidth = data.maxWidth;

		return node;
	}

};

export default TextMeasurer;
