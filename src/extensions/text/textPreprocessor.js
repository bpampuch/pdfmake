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

		this.parentTextNode = null;
	}

	preprocessText(node) {
		if (isArray(node.text)) {
			let isSetParentTextNode = false;
			if (this.parentTextNode === null) {
				this.parentTextNode = node;
				isSetParentTextNode = true;
			}

			for (let i = 0, l = node.text.length; i < l; i++) {
				node.text[i] = this.preprocessNode(node.text[i]);
			}

			if (isSetParentTextNode) {
				this.parentTextNode = null;
			}
		}

		return node;
	}

};

export default TextPreprocessor;
