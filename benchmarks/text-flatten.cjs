const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const flatten = require('rewire')('../js/TextInlines').__get__('flattenTextArray');

function previous(array) {
	return array.reduce((prev, cur) => {
		const current = Array.isArray(cur.text) ? previous(cur.text) : cur;
		return prev.concat([].concat(current).some(Array.isArray) ? previous(current) : current);
	}, []);
}
function medianTime(fn, input) {
	fn(input);
	const times = Array.from({ length: 7 }, () => {
		const start = performance.now();
		fn(input);
		return performance.now() - start;
	}).sort((a, b) => a - b);
	return times[3];
}
console.log(`Node ${process.version}, ${process.platform}/${process.arch}; median of 7, milliseconds`);
for (const size of [1000, 5000, 15000]) {
	const input = Array.from({ length: size }, (_, i) => i % 3 ? { text: String(i), bold: true } : [{ text: [String(i)] }]);
	assert.deepEqual(flatten(input), previous(input));
	const before = medianTime(previous, input);
	const after = medianTime(flatten, input);
	console.log(JSON.stringify({ inlines: size, previousMs: +before.toFixed(3), optimizedMs: +after.toFixed(3), speedup: +(before / after).toFixed(2) }));
}
console.log('Measures text flattening only; this is not an end-to-end PDF speedup.');
