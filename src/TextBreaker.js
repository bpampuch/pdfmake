import LineBreaker from 'linebreak';
import { isArray, isObject, isUndefined } from './helpers/variableType';
import StyleContextStack from './styleContextStack';

/**
 * @param {string} text
 * @param {boolean} noWrap
 * @return {array}
 */
const splitWords = function (text, noWrap) {
	let words = [];

	if (noWrap) {
		words.push({ text: text });
		return words;
	}

	let breaker = new LineBreaker(text);
	let last = 0;
	let bk;

	while (bk = breaker.nextBreak()) {
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
}

/**
 * @param {array} words
 * @param {boolean} noWrap
 * @return {string|null}
 */
const getFirstWord = function (words, noWrap) {
	let word = words[0];
	if (isUndefined(word)) {
		return null;
	}

	return getOneWord(word, noWrap);
}

/**
 * @param {array} words
 * @param {boolean} noWrap
 * @return {string|null}
 */
const getLastWord = function (words, noWrap) {
	let word = words[words.length - 1];
	if (isUndefined(word)) {
		return null;
	}

	if (word.lineEnd) {
		return null;
	}

	return getOneWord(word, noWrap);
}

/**
 * @param {object} word
 * @param {boolean} noWrap
 * @return {string|null}
 */
const getOneWord = function (word, noWrap) {
	word = word.text;

	if (noWrap) { // text was not wrapped, we need only last word
		let tmpWords = splitWords(word, false);
		if (isUndefined(tmpWords[tmpWords.length - 1])) {
			return null;
		}
		word = tmpWords[tmpWords.length - 1].text;
	}

	return word;
}

class TextBreaker {

	/**
	 *
	 * @param {string|array} texts
	 * @param {StyleContextStack} styleContextStack
	 */
	getBreaks(texts, styleContextStack) {
		let results = [];

		if (!isArray(texts)) {
			texts = [texts];
		}

		let lastWord = null;
		for (var i = 0, l = texts.length; i < l; i++) {
			let item = texts[i];
			let style = null;
			let words;

			let noWrap = StyleContextStack.getStyleProperty(item || {}, styleContextStack, 'noWrap', false);
			if (isObject(item)) {
				words = splitWords(item.text, noWrap);
				style = StyleContextStack.copyStyle(item);
			} else {
				words = splitWords(item, noWrap);
			}

			if (lastWord && words.length) {
				let firstWord = getFirstWord(words, noWrap);

				var wrapWords = splitWords(lastWord + firstWord, false);
				if (wrapWords.length === 1) {
					results[results.length - 1].noNewLine = true;
				}
			}

			for (var i2 = 0, l2 = words.length; i2 < l2; i2++) {
				var result = {
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
