class Line {
	/**
	 * @param {number} maxWidth Maximum width this line can have
	 */
	constructor(maxWidth) {
		this.maxWidth = maxWidth;
		this.leadingCut = 0;
		this.trailingCut = 0;
		this.inlineWidths = 0;
		this.inlines = [];
	}

	/**
	 * @param {object} inline
	 */
	addInline(inline) {
		if (this.inlines.length === 0) {
			this.leadingCut = inline.leadingCut || 0;
		}
		this.trailingCut = inline.trailingCut || 0;

		inline.x = this.inlineWidths - this.leadingCut;

		this.inlines.push(inline);
		this.inlineWidths += inline.width;

		if (inline.lineEnd) {
			this.newLineForced = true;
		}
	}

	/**
	 * @returns {number}
	 */
	getHeight() {
		let max = 0;

		this.inlines.forEach(item => {
			max = Math.max(max, item.height || 0);
		});

		return max;
	}

	/**
	 * @returns {number}
	 */
	getAscenderHeight() {
		let y = 0;

		this.inlines.forEach(inline => {
			y = Math.max(y, inline.font.ascender / 1000 * inline.fontSize);
		});

		return y;
	}

	/**
	 * @returns {number}
	 */
	getWidth() {
		return this.inlineWidths - this.leadingCut - this.trailingCut;
	}

	/**
	 * @returns {number}
	 */
	getAvailableWidth() {
		return this.maxWidth - this.getWidth();
	}

	/**
	 * @param {object} inline
	 * @param {Array} nextInlines
	 * @returns {boolean}
	 */
	hasEnoughSpaceForInline(inline, nextInlines = []) {
		if (this.inlines.length === 0) {
			return true;
		}
		if (this.newLineForced) {
			return false;
		}

		let inlineWidth = inline.width;
		let inlineTrailingCut = inline.trailingCut || 0;
		if (inline.noNewLine) {
			for (let i = 0, l = nextInlines.length; i < l; i++) {
				let nextInline = nextInlines[i];
				inlineWidth += nextInline.width;
				inlineTrailingCut += nextInline.trailingCut || 0;
				if (!nextInline.noNewLine) {
					break;
				}
			}
		}

		return (this.inlineWidths + inlineWidth - this.leadingCut - inlineTrailingCut) <= this.maxWidth;
	}

	clone() {
		let result = new Line(this.maxWidth);

		for (let key in this) {
			if (this.hasOwnProperty(key)) {
				result[key] = this[key];
			}
		}

		return result;
	}
}

export default Line;
