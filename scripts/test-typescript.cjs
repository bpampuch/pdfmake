// Compile and execute consumers against the actual npm tarball, never source aliases.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const webpack = require('webpack');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfmake-typescript-'));
const npm = process.env.npm_execpath;
assert.ok(npm, 'Run through npm run test:typescript');
const runNpm = args => execFileSync(process.execPath, [npm, ...args], { cwd: temp, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });
const compiler = require.resolve('typescript/bin/tsc');
function compile(args) {
  try { execFileSync(process.execPath, [compiler, '--strict', '--skipLibCheck', 'false', '--target', 'ES2022', '--esModuleInterop', ...args], { cwd: temp, stdio: 'pipe' }); }
  catch (error) { throw new Error(error.stdout?.toString() || error.message); }
}
(async () => {
  const packed = JSON.parse(execFileSync(process.execPath, [npm, 'pack', '--json', '--pack-destination', temp], { cwd: root, encoding: 'utf8' }))[0];
  fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify({ name: 'pdfmake-typescript-consumer', version: '1.0.0', private: true }));
  runNpm(['install', '--ignore-scripts', '--no-audit', '--no-fund', path.join(temp, packed.filename)]);
  assert.equal(fs.existsSync(path.join(temp, 'node_modules/@types/pdfmake')), false, 'Native types must work without @types/pdfmake');
  fs.cpSync(path.join(root, 'tests/typescript'), path.join(temp, 'src'), { recursive: true });
  compile(['--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--outDir', 'node-out', 'src/node.cts', 'src/node.mts', 'src/invalid.cts']);
  for (const file of ['node.cjs', 'node.mjs']) execFileSync(process.execPath, [path.join('node-out', file)], { cwd: temp, stdio: 'inherit' });
  compile(['--module', 'ESNext', '--moduleResolution', 'Bundler', '--outDir', 'browser-out', 'src/browser.ts']);
  await new Promise((resolve, reject) => {
    const compiler = webpack({ mode: 'development', target: 'web', entry: path.join(temp, 'browser-out/browser.js'), output: { path: path.join(temp, 'bundled'), filename: 'browser.cjs', library: { type: 'commonjs2' } }, performance: { hints: false } });
    compiler.run((error, stats) => compiler.close(() => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  });
  const blob = await require(path.join(temp, 'bundled/browser.cjs')).render();
  assert.equal(Buffer.from(await blob.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
  console.log(`TypeScript ${require('typescript/package.json').version}, bundled declarations: strict CJS, Node ESM, browser bundler, negative types and PDF output passed`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => fs.rmSync(temp, { recursive: true, force: true }));
