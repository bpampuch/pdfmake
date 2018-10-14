import { isUndefined, isArray } from '../../helpers/variableType';

/**
 * @mixin
 */
const ImageNormalizer = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'image' in node,
			node => this.normalizeImage(node)
		);
	}

	normalizeImage(node) {
		if (!isUndefined(node.image.type) && !isUndefined(node.image.data) &&
			(node.image.type === 'Buffer') && isArray(node.image.data)) {
			node.image = Buffer.from(node.image.data);
		}

		return node;
	}

};

export default ImageNormalizer;
