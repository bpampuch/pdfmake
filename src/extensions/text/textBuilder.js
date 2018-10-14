import { addAll } from '../../helpers/tools';
import Line from '../../Line';
import TextInlines from '../../TextInlines';

/**
 * @mixin
 */
const TextBuilder = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerNodeType(
			node => 'text' in node,
			node => this.buildText(node)
		);
	}

	buildText(node) {

		// TODO

	}

	_buildNextLine(textNode) {
		const cloneInline = function (inline) {
			let newInline = inline.constructor();
			for (let key in inline) {
				newInline[key] = inline[key];
			}
			return newInline;
		};

		if (!textNode._inlines || textNode._inlines.length === 0) {
			return null;
		}

		let textInlines = TextInlines(this.pdfDocument);
		let line = new Line(this.writer.context().availableWidth); // TODO context

		let isForceContinue = false;
		while (textNode._inlines && textNode._inlines.length > 0 &&
			(line.hasEnoughSpaceForInline(textNode._inlines[0], textNode._inlines.slice(1)) || isForceContinue)) {
			let isHardWrap = false;
			let inline = textNode._inlines.shift();
			isForceContinue = false;

			if (!inline.noWrap && inline.text.length > 1 && inline.width > line.getAvailableWidth()) {
				let widthPerChar = inline.width / inline.text.length;
				let maxChars = Math.floor(line.getAvailableWidth() / widthPerChar);
				if (maxChars < 1) {
					maxChars = 1;
				}
				if (maxChars < inline.text.length) {
					let newInline = cloneInline(inline);

					newInline.text = inline.text.substr(maxChars);
					inline.text = inline.text.substr(0, maxChars);

					newInline.width = textInlines.widthOfText(newInline.text, newInline);
					inline.width = textInlines.widthOfText(inline.text, inline);

					textNode._inlines.unshift(newInline);
					isHardWrap = true;
				}
			}

			line.addInline(inline);

			isForceContinue = inline.noNewLine && !isHardWrap;
		}

		line.lastLineInParagraph = textNode._inlines.length === 0;

		return line;
	}

};

export default TextBuilder;
