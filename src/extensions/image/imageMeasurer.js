import { isNumber } from '../../helpers/variableType';

/**
 * @mixin
 */
const ImageMeasurer = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'image' in node,
			node => this.measureImage(node)
		);

		this.autoImageIndex = 0;
	}

	measureImage(node) {
		if (/^data:image\/(jpeg|jpg|png);base64,/.test(node.image)) { // base64 image
			let label = '$$pdfmake$$' + this.autoImageIndex++;
			this.pdfDocument.images[label] = node.image;
			node.image = label;
		}

		let image = this.pdfDocument.provideImage(node.image);

		if (node.fit) {
			let factor = (image.width / image.height > node.fit[0] / node.fit[1]) ? node.fit[0] / image.width : node.fit[1] / image.height;
			node._width = node._minWidth = node._maxWidth = image.width * factor;
			node._height = image.height * factor;
		} else {
			node._width = node._minWidth = node._maxWidth = node.width || image.width;
			node._height = node.height || (image.height * node._width / image.width);

			if (isNumber(node.maxWidth) && node.maxWidth < node._width) {
				node._width = node._minWidth = node._maxWidth = node.maxWidth;
				node._height = node._width * image.height / image.width;
			}

			if (isNumber(node.maxHeight) && node.maxHeight < node._height) {
				node._height = node.maxHeight;
				node._width = node._minWidth = node._maxWidth = node._height * image.width / image.height;
			}

			if (isNumber(node.minWidth) && node.minWidth > node._width) {
				node._width = node._minWidth = node._maxWidth = node.minWidth;
				node._height = node._width * image.height / image.width;
			}

			if (isNumber(node.minHeight) && node.minHeight > node._height) {
				node._height = node.minHeight;
				node._width = node._minWidth = node._maxWidth = node._height * image.width / image.height;
			}
		}

		node._alignment = this.styleStack.getProperty('alignment');
		return node;
	}

};

export default ImageMeasurer;
