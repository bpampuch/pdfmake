import { isString, isNumber, isBoolean, isArray, isValue, isEmptyObject } from '../../helpers/variableType';

const convertValueToString = function (value) {
	if (isString(value)) {
		return value;
	} else if (isNumber(value) || isBoolean(value)) {
		return value.toString();
	} else if (!isValue(value) || isEmptyObject(value)) {
		return '';
	}

	// TODO throw exception ?

	return value;
};

/**
 * @mixin
 */
const TextNormalizer = Base => class extends Base {

	constructor() {
		super();

		this.registerCleanup(
			node => this.cleanupText(node)
		);

		this.registerNodeType(
			node => node.text,
			node => this.normalizeText(node)
		);
	}

	cleanupText(node) {
		if (isString(node) || isNumber(node) || isBoolean(node) || !isValue(node) || isEmptyObject(node)) { // text node defined as value
			node = { text: convertValueToString(node) };
		} else if ('text' in node) { // cast value in text property
			node.text = convertValueToString(node.text);
		}

		return node;
	}

	normalizeText(node) {
		if (node.text && node.text.text) {
			node.text = [this.normalizeNode(node.text)];
		} else if (isArray(node.text)) {
			for (var i = 0, l = node.text.length; i < l; i++) {
				node.text[i] = this.normalizeNode(node.text[i]);
			}
		}

		return node;
	}

};

export default TextNormalizer;
