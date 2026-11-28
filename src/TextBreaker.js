import { LineBreaker } from 'linebreak';
import { isObject } from './helpers/variableType';
import StyleContextStack from './StyleContextStack';

/**
 * @param {string} text
 * @returns {Array}
 */
const splitWords = text => {
	const words = [];
	const breaker = new LineBreaker(text);
	let last = 0;
	let bk;

	while ((bk = breaker.nextBreak())) {
		const word = text.slice(last, bk.position);

		// linebreak 2.0.0 does not mark a hard break at the end of the text as required.
		// A newer version will fix this.
		if (word.match(/\r?\n$|\r$/)) {
			bk.required = true;
		}

		const result = { end: bk.position };
		if (bk.required) {
			result.lineEnd = true;
		}
		words.push(result);
		last = bk.position;
	}

	return words;
};

/**
 * @param {string} text
 * @param {Array} fragments
 */
const prepareBreaks = (text, fragments) => {
	const words = splitWords(text);
	const naturalBreaks = new Map(words.map(word => [word.end, word]));
	let wordIndex = 0;

	for (let index = 0; index < fragments.length; index++) {
		const fragment = fragments[index];
		// keep each code point in the fragment where it starts, including across empty fragments
		fragment.start = index > 0 ? fragments[index - 1].end : 0;
		if (fragment.end > 0 && String.fromCodePoint(text.codePointAt(fragment.end - 1)).length === 2) {
			fragment.end++;
		}
		const ends = [];

		const firstWordIndex = wordIndex;
		while (wordIndex < words.length && words[wordIndex].end <= fragment.end) {
			wordIndex++;
		}

		if (fragment.noWrap) {
			for (let i = firstWordIndex; i < wordIndex; i++) {
				const word = words[i];
				if (word.end > fragment.start && word.lineEnd) {
					ends.push(word.end);
				}
			}
		} else if (fragment.breakAll) {
			for (let position = fragment.start; position < fragment.end;) {
				const character = String.fromCodePoint(text.codePointAt(position));
				position += character.length;
				ends.push(position);
			}
		} else {
			for (let i = firstWordIndex; i < wordIndex; i++) {
				const word = words[i];
				if (word.end > fragment.start) {
					ends.push(word.end);
				}
			}
		}

		if (ends[ends.length - 1] !== fragment.end) {
			ends.push(fragment.end);
		}

		let start = fragment.start;
		fragment.breaks = ends.map(end => {
			const hasText = end > start;
			const word = naturalBreaks.get(end);
			const continuesNoWrap = end === fragment.end && fragment.noWrap && fragments[index + 1]?.noWrap;
			const canBreak = !continuesNoWrap && (word || !fragment.noWrap && fragment.breakAll && hasText);
			const boundary = { end: end };

			if (hasText && word?.lineEnd) {
				boundary.lineEnd = true;
			}
			if (end > 0 && end < text.length && !boundary.lineEnd && !canBreak) {
				boundary.noNewLine = true;
			}
			start = end;

			return boundary;
		});
	}
};

class TextBreaker {
	/**
	 * @param {string|Array} texts
	 * @param {StyleContextStack} styleContextStack
	 * @returns {Array}
	 */
	getBreaks(texts, styleContextStack) {
		if (!Array.isArray(texts)) {
			texts = [texts];
		}

		let length = 0;
		const fragments = texts.map(item => {
			let text = item;
			let style = null;

			if (isObject(item)) {
				if (item._textRef && item._textRef._textNodeRef.text) {
					item.text = item._textRef._textNodeRef.text;
				}
				text = item.text;
				style = StyleContextStack.copyStyle(item);
			}

			text = (text === undefined) || text === null ? '' : String(text);

			if (text.length) {
				text = text.replace(/\r\n?/g, '\n');
			}

			const fragment = {
				start: length,
				end: length + text.length,
				text: text,
				style: style,
				noWrap: StyleContextStack.getStyleProperty(item || {}, styleContextStack, 'noWrap', false),
				breakAll: StyleContextStack.getStyleProperty(item || {}, styleContextStack, 'wordBreak', 'normal') === 'break-all'
			};

			length = fragment.end;

			return fragment;
		});

		const text = fragments.map(fragment => fragment.text).join('');

		prepareBreaks(text, fragments);

		const results = [];
		for (const fragment of fragments) {
			let start = fragment.start;
			for (const { end, ...flags } of fragment.breaks) {
				const result = { text: text.slice(start, end), ...flags };
				if (result.lineEnd) {
					result.text = result.text.slice(0, -1);
				}
				StyleContextStack.copyStyle(fragment.style, result);
				results.push(result);
				start = end;
			}
		}

		return results;
	}
}

export default TextBreaker;
