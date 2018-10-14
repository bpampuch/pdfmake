import { isArray } from './helpers/variableType';
import TextBreaker from './textBreaker';
import StyleContextStack from './styleContextStack';
import defaults from './defaults';

const LEADING = /^(\s)+/g;
const TRAILING = /(\s)+$/g;

/**
 * @param {array} textArray
 * @return {array}
 */
const flattenTextArray = function (array) {
	function flatten(array) {
		return array.reduce(function (prev, cur) {
			var current = isArray(cur.text) ? flatten(cur.text) : cur;
			var more = [].concat(current).some(Array.isArray);
			return prev.concat(more ? flatten(current) : current);
		}, []);
	}

	if (!isArray(array)) {
		array = [array];
	}

	// TODO: Styling in nested text (issue: https://github.com/bpampuch/pdfmake/issues/1174)

	array = flatten(array);

	return array;
}

class TextInlines {

	/**
	 * @param {FontProvider} fontProvider
	 */
	constructor(fontProvider) {
		this.fontProvider = fontProvider;
	}

	buildInlines(textArray, styleContextStack) {
		let flattenText = flattenTextArray(textArray);

		let textBreaker = new TextBreaker();
		let breakedText = textBreaker.getBreaks(flattenText);

		let measuredText = this.measure(breakedText, styleContextStack);

		// TODO

		return {
			items: measuredText,
			minWidth: null, // TODO
			maxWidth: null // TODO
		};
	}

	measure(array, styleContextStack) {
		if (array.length) {
			let leadingIndent = StyleContextStack.getStyleProperty(array[0], styleContextStack, 'leadingIndent', defaults.leadingIndent);
			if (leadingIndent) {
				array[0].leadingCut = -leadingIndent;
				array[0].leadingIndent = leadingIndent;
			}
		}

		array.forEach(function (item) {
			let font = StyleContextStack.getStyleProperty(item, styleContextStack, 'font', defaults.font);
			let bold = StyleContextStack.getStyleProperty(item, styleContextStack, 'bold', defaults.bold);
			let italics = StyleContextStack.getStyleProperty(item, styleContextStack, 'italics', defaults.italics);

			item.font = this.fontProvider.provideFont(font, bold, italics);

			item.alignment = StyleContextStack.getStyleProperty(item, styleContextStack, 'alignment', defaults.alignment);
			item.fontSize = StyleContextStack.getStyleProperty(item, styleContextStack, 'fontSize', defaults.fontSize);
			item.fontFeatures = StyleContextStack.getStyleProperty(item, styleContextStack, 'fontFeatures', defaults.fontFeatures);
			item.characterSpacing = StyleContextStack.getStyleProperty(item, styleContextStack, 'characterSpacing', defaults.characterSpacing);
			item.color = StyleContextStack.getStyleProperty(item, styleContextStack, 'color', defaults.color);
			item.decoration = StyleContextStack.getStyleProperty(item, styleContextStack, 'decoration', defaults.decoration);
			item.decorationColor = StyleContextStack.getStyleProperty(item, styleContextStack, 'decorationColor', defaults.decorationColor);
			item.decorationStyle = StyleContextStack.getStyleProperty(item, styleContextStack, 'decorationStyle', defaults.decorationStyle);
			item.background = StyleContextStack.getStyleProperty(item, styleContextStack, 'background', defaults.background);
			item.link = StyleContextStack.getStyleProperty(item, styleContextStack, 'link', defaults.link);
			item.linkToPage = StyleContextStack.getStyleProperty(item, styleContextStack, 'linkToPage', defaults.linkToPage);
			item.noWrap = StyleContextStack.getStyleProperty(item, styleContextStack, 'noWrap', defaults.noWrap);

			let lineHeight = StyleContextStack.getStyleProperty(item, styleContextStack, 'lineHeight', defaults.lineHeight);

			item.width = this.widthOfText(item.text, item);
			item.height = item.font.lineHeight(item.fontSize) * lineHeight;

			if (!item.leadingCut) {
				item.leadingCut = 0;
			}

			let preserveLeadingSpaces = StyleContextStack.getStyleProperty(item, styleContextStack, 'preserveLeadingSpaces', defaults.preserveLeadingSpaces);
			if (!preserveLeadingSpaces) {
				let leadingSpaces = item.text.match(LEADING);
				if (leadingSpaces) {
					item.leadingCut += this.widthOfText(leadingSpaces[0], item);
				}
			}

			let trailingSpaces = item.text.match(TRAILING);
			if (trailingSpaces) {
				item.trailingCut = this.widthOfText(trailingSpaces[0], item);
			} else {
				item.trailingCut = 0;
			}
		}, this);

		return array
	}

	widthOfText(text, inline) {
		return inline.font.widthOfString(text, inline.fontSize, inline.fontFeatures) + ((inline.characterSpacing || 0) * (text.length - 1));
	}

}

export default TextInlines;
