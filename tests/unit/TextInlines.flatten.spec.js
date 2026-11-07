const assert = require('assert');
const rewire = require('rewire');
const flatten = rewire('../../js/TextInlines').__get__('flattenTextArray');

describe('flattenTextArray', function () {
	it('preserves leaf identity, order, empty arrays and existing nested-style behavior', function () {
		const bold = { text: 'bold', bold: true };
		const input = ['first', [{ text: ['nested', bold], italics: true }, []], 'last'];
		assert.deepStrictEqual(flatten(input), ['first', 'nested', bold, 'last']);
		assert.strictEqual(flatten(input)[2], bold);
		assert.strictEqual(input[1][0].italics, true);
	});

	it('handles scalar input and sparse arrays', function () {
		const input = [];
		input[2] = 'third';
		assert.deepStrictEqual(flatten(input), ['third']);
		assert.deepStrictEqual(flatten('text'), ['text']);
		assert.deepStrictEqual(flatten({ text: [] }), []);
	});

	it('handles deeply nested arrays without recursive calls', function () {
		let input = 'leaf';
		for (let i = 0; i < 20000; i++) {
			input = { text: [input] };
		}
		assert.deepStrictEqual(flatten(input), ['leaf']);
	});

	it('matches the previous implementation on deterministic mixed trees', function () {
		function previous(array) {
			return array.reduce((prev, cur) => {
				const current = Array.isArray(cur.text) ? previous(cur.text) : cur;
				const more = [].concat(current).some(Array.isArray);
				return prev.concat(more ? previous(current) : current);
			}, []);
		}
		let seed = 17;
		function next() {
			seed = (seed * 16807) % 2147483647;
			return seed;
		}
		function tree(depth) {
			return Array.from({ length: next() % 6 }, () => {
				const kind = next() % 4;
				if (depth && kind < 2) {
					return kind ? { text: tree(depth - 1), bold: true } : tree(depth - 1);
				}
				return kind === 2 ? { text: String(next()), color: 'red' } : String(next());
			});
		}
		for (let i = 0; i < 200; i++) {
			const input = tree(4);
			assert.deepStrictEqual(flatten(input), previous(input));
		}
	});
});
