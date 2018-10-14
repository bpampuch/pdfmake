import { addAll } from '../../helpers/tools';
import Line from '../../Line';

/**
 * @mixin
 */
const TextBuilder = Base => class extends Base {

	constructor() {
		super();

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

		let line = new Line(this.writer.context().availableWidth); // TODO context
		// TODO

	}

};

export default TextBuilder;
