import { isArray } from '../../helpers/variableType';

/**
 * @mixin
 */
const TextPreprocessor = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'text' in node,
			node => this.preprocessText(node)
		);
	}

	preprocessText(node) {
		if (isArray(node.text)) {
			for (var i = 0, l = node.text.length; i < l; i++) {
				node.text[i] = this.preprocessNode(node.text[i]);
			}
		}

		return node;
	}

};

export default TextPreprocessor;
