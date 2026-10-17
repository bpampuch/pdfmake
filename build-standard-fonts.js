const fs = require('fs');
const path = require('path');

const sourceDirectory = path.join(__dirname, 'src/browser-extensions/standard-fonts');
const outputDirectory = path.join(__dirname, 'build/standard-fonts');
const footer = `
var _global = typeof window === 'object' ? window : typeof global === 'object' ? global : typeof self === 'object' ? self : this;
if (typeof _global.pdfMake !== 'undefined' && typeof _global.pdfMake.addFontContainer !== 'undefined') {
	_global.pdfMake.addFontContainer(fontContainer);
}
if (typeof module !== 'undefined') {
	module.exports = fontContainer;
}
`;

fs.mkdirSync(outputDirectory, { recursive: true });

for (const filename of fs.readdirSync(sourceDirectory).filter(filename => filename.endsWith('.js'))) {
	const fontContainer = require(path.join(sourceDirectory, filename));
	const content = 'var fontContainer = ' + JSON.stringify(fontContainer) + ';\n' + footer;
	fs.writeFileSync(path.join(outputDirectory, filename), content);
}
