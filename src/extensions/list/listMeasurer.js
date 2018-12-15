import defaults from '../../defaults';

const convertToAlpha = counter => {
	const toAlpha = num => {
		return (num >= 26 ? toAlpha((num / 26 >> 0) - 1) : '') + 'abcdefghijklmnopqrstuvwxyz'[num % 26 >> 0];
	};

	if (counter < 1) {
		return counter.toString();
	}

	return toAlpha(counter - 1);
};

const convertToRoman = counter => {
	if (counter < 1 || counter > 4999) {
		return counter.toString();
	}

	let num = counter;
	let lookup = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 }, roman = '', i;
	for (i in lookup) {
		while (num >= lookup[i]) {
			roman += i;
			num -= lookup[i];
		}
	}

	return roman;
};

const convertToDecimal = counter => {
	return counter.toString();
};



/**
 * @mixin
 */
const ListMeasurer = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'ul' in node,
			node => this.measureUnorderedList(node)
		);

		this.registerNodeType(
			node => 'ol' in node,
			node => this.measureOrderedList(node)
		);
	}

	measureUnorderedList(node) {
		let items = node.ul;

		for (let i = 0, l = items.length; i < l; i++) {
			items[i] = this.measureNode(items[i]);

			// TODO
		}

		return node;
	}

	measureOrderedList(node) {
		let items = node.ol;
		let style = this.styleStack.clone();
		node.type = node.type || defaults.ol_type;
		node.separator = node.separator || defaults.ol_separator;
		node.reversed = node.reversed || defaults.ol_reversed;
		if (!node.start) {
			node.start = node.reversed ? items.length : 1;
		}
		node._gapSize = this.gapSizeForList();
		node._minWidth = 0;
		node._maxWidth = 0;

		let counter = node.start;
		for (let i = 0, l = items.length; i < l; i++) {
			let item = items[i] = this.measureNode(items[i]);

			// TODO
		}

		return node;
	}

	_gapSizeForList() {
		return this.textTools.sizeOfString('9. ', this.styleStack);
	}

};

export default ListMeasurer;
