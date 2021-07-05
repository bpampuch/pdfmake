import LineBreaker from '@foliojs-fork/linebreak';
import { isObject } from './helpers/variableType';
import StyleContextStack from './StyleContextStack';

/**
 * @param {string} text
 * @param {boolean} noWrap
 * @returns {Array}
 */
const splitWords = (text, noWrap) => {
	let words = [];

	if (noWrap) {
		words.push({ text: text });
		return words;
	}

	let breaker = new LineBreaker(text);
	let last = 0;
	let bk;

	while ((bk = breaker.nextBreak())) {
		let word = text.slice(last, bk.position);

		if (bk.required || word.match(/\r?\n$|\r$/)) { // new line
			word = word.replace(/\r?\n$|\r$/, '');
			words.push({ text: word, lineEnd: true });
		} else {
			words.push({ text: word });
		}

		last = bk.position;
	}

	return words;
};

/**
 * @param {Array} words
 * @param {boolean} noWrap
 * @returns {?string}
 */
const getFirstWord = (words, noWrap) => {
	let word = words[0];
	if (word === undefined) {
		return null;
	}

	if (noWrap) { // text was not wrapped, we need only first word
		let tmpWords = splitWords(word.text, false);
		if (tmpWords[0] === undefined) {
			return null;
		}
		word = tmpWords[0];
	}

	return word.text;
};

/**
 * @param {Array} words
 * @param {boolean} noWrap
 * @returns {?string}
 */
const getLastWord = (words, noWrap) => {
	let word = words[words.length - 1];
	if (word === undefined) {
		return null;
	}

	if (word.lineEnd) {
		return null;
	}

	if (noWrap) { // text was not wrapped, we need only last word
		let tmpWords = splitWords(word.text, false);
		if (tmpWords[tmpWords.length - 1] === undefined) {
			return null;
		}
		word = tmpWords[tmpWords.length - 1];
	}

	return word.text;
};

class TextBreaker {
	/**
	 * @param {string|Array} texts
	 * @param {StyleContextStack} styleContextStack
	 * @returns {Array}
	 */
	getBreaks(texts, styleContextStack) {
		let results = [];

		if (!Array.isArray(texts)) {
			texts = [texts];
		}

		let lastWord = null;
		for (let i = 0, l = texts.length; i < l; i++) {
			let item = texts[i];
			let style = null;
			let words;

			let noWrap = StyleContextStack.getStyleProperty(item || {}, styleContextStack, 'noWrap', false);
			if (isObject(item)) {
				if (item._textRef && item._textRef._textNodeRef.text) {
					item.text = item._textRef._textNodeRef.text;
				}
				words = splitWords(item.text, noWrap);
				style = StyleContextStack.copyStyle(item);
			} else {
				words = splitWords(item, noWrap);
			}

			if (lastWord && words.length) {
				let firstWord = getFirstWord(words, noWrap);

				let wrapWords = splitWords(lastWord + firstWord, false);
				if (wrapWords.length === 1) {
					results[results.length - 1].noNewLine = true;
				}
			}

			for (let i2 = 0, l2 = words.length; i2 < l2; i2++) {
				let result = {
					text: words[i2].text
				};

				if (words[i2].lineEnd) {
					result.lineEnd = true;
				}

				StyleContextStack.copyStyle(style, result);

				results.push(result);
			}

			lastWord = null;
			if (i + 1 < l) {
				lastWord = getLastWord(words, noWrap);
			}
		}

		return results;
	}
}

export default TextBreaker;
