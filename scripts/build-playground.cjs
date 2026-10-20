(async () => {
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const playgroundRequire = require('node:module').createRequire(path.join(root, 'dev-playground/package.json'));
const { buildSync } = playgroundRequire('esbuild');
const output = path.join(root, 'dev-playground/public/vendor');
fs.mkdirSync(output, { recursive: true });
for (const name of ['pdfmake.min.js', 'vfs_fonts.js']) {
	const source = path.join(root, 'build', name);
	if (!fs.existsSync(source)) throw new Error('Build the library first with npm run build');
	fs.copyFileSync(source, path.join(output, name));
}
fs.writeFileSync(path.join(output, 'version.json'), JSON.stringify({ version: require('../package.json').version }));
const pdfjs = path.dirname(playgroundRequire.resolve('pdfjs-dist/package.json'));
for (const name of ['pdf.mjs', 'pdf.worker.mjs']) fs.copyFileSync(path.join(pdfjs, 'build', name), path.join(output, name));
fs.copyFileSync(path.join(pdfjs, 'LICENSE'), path.join(output, 'PDFJS-LICENSE.txt'));
buildSync({ entryPoints: [path.join(root, 'dev-playground/editor.mjs')], outfile: path.join(root, 'dev-playground/public/editor.js'), bundle: true, minify: true, format: 'esm', target: 'es2020', legalComments: 'eof' });
await (await import('./prepare-typescript.mjs')).prepareTypeScript(output, { transform: playgroundRequire('esbuild').transform });
console.log('Standalone playground prepared from the local library build');

})().catch(error => { console.error(error); process.exitCode = 1; });
