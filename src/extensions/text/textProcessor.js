import { isArray } from '../../helpers/variableType';

/**
 * @mixin
 */
const TextProcessor = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'text' in node,
			node => this.processText(node)
		);
	}

	processText(node) {
		if (isArray(node.text)) {
			for (let i = 0, l = node.text.length; i < l; i++) {
				node.text[i] = this.processNode(node.text[i]);
			}
		}

		return node;
	}

};

export default TextProcessor;
