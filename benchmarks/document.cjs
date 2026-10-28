const { performance } = require('node:perf_hooks');
const rewire = require('rewire');
const textModule = rewire('../js/TextInlines');

function previous(array) {
	function flatten(items) {
		return items.reduce((prev, cur) => {
			const current = Array.isArray(cur.text) ? flatten(cur.text) : cur;
			return prev.concat([].concat(current).some(Array.isArray) ? flatten(current) : current);
		}, []);
	}
	return flatten(Array.isArray(array) ? array : [array]);
}
if (process.argv.includes('--previous')) textModule.__set__('flattenTextArray', previous);
require('../js/TextInlines').default = textModule.default;
const pdfmake = require('../js/index');
const fonts = require('../standard-fonts/Helvetica');
pdfmake.addFonts(fonts);
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy(name => Object.values(fonts.Helvetica).includes(name));

(async () => {
	for (const size of [1000, 5000, 15000]) {
		const times = [];
		let bytes;
		for (let run = 0; run < 4; run++) {
			const definition = { defaultStyle: { font: 'Helvetica', fontSize: 10 }, content: [{ text:
				Array.from({ length: size }, (_, i) => ({ text: `word${i} `, bold: i % 3 === 0 }))
			}] };
			const start = performance.now();
			bytes = await pdfmake.createPdf(definition).getBuffer();
			if (run) times.push(performance.now() - start);
		}
		times.sort((a, b) => a - b);
		console.log(JSON.stringify({ algorithm: process.argv.includes('--previous') ? 'previous' : 'optimized', node: process.version,
			platform: process.platform, inlines: size, medianMs: +times[1].toFixed(2), bytes: bytes.length,
			pages: Number(bytes.toString('latin1').match(/\/Count (\d+)/)[1]) }));
	}
})().catch(error => { console.error(error); process.exitCode = 1; });
