// Test the actual tarball in an isolated consumer, with production dependencies only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfmake-package-'));
// npm scripts expose npm_execpath on Windows too, avoiding cmd.exe quoting.
const npm = process.env.npm_execpath;
assert.ok(npm, 'Run this script through npm run test:package');
function run(args, cwd) {
	return execFileSync(process.execPath, [npm, ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}
try {
	const [packed] = JSON.parse(run(['pack', '--json', '--pack-destination', temp], root));
	fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify({ name: 'pdfmake-smoke', version: '1.0.0', private: true }));
	run(['install', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', path.join(temp, packed.filename)], temp);
	const consumer = String.raw`
const assert = require('node:assert/strict');
const fs = require('node:fs');
const pdfmake = require('pdfmake');
const fonts = require('pdfmake/standard-fonts/Helvetica');
pdfmake.addFonts(fonts);
pdfmake.setUrlAccessPolicy(() => false);
const standardNames = new Set(Object.values(fonts.Helvetica));
pdfmake.setLocalAccessPolicy(name => standardNames.has(name));
function definition() {
  return {
    defaultStyle: { font: 'Helvetica' },
    info: { title: 'Package regression' },
    content: [
      { text: ['Nested ', [{ text: ['inline ', 'text'] }]] },
      { table: { headerRows: 1, widths: ['*', 'auto'], body: [['Item', 'Value'], ['One', 1]] } },
      { text: 'Second page', pageBreak: 'before' }
    ]
  };
}
function check(bytes) {
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  assert.match(bytes.toString('latin1'), /%%EOF\s*$/);
  assert.match(bytes.toString('latin1'), /\/Count 2\b/);
}
(async () => {
  assert.equal(pdfmake.validateDocument(definition()).valid, true);
  assert.equal(pdfmake.validateDocument({ content: [{ text: 'bad', fontSize: 'large' }] }).valid, false);
  const output = pdfmake.createPdf(definition(), { validation: true });
  const buffer = await output.getBuffer();
  check(buffer);
  assert.strictEqual(await output.getBuffer(), buffer);
  assert.equal(await output.getBase64(), buffer.toString('base64'));
  await assert.rejects(output.getStream(), /PDF stream has already been consumed/);
  await output.write('cached.pdf');
  assert.deepEqual(fs.readFileSync('cached.pdf'), buffer);
  await pdfmake.createPdf(definition()).write('smoke.pdf');
  check(fs.readFileSync('smoke.pdf'));
  // Exercise both distributed browser bundles and the shipped VFS assets.
  for (const bundle of ['pdfmake', 'pdfmake.min']) {
    // React Native supplies URL without support for relative module base URLs.
    const nativeURL = global.URL;
    let browser;
    try {
      global.URL = class { constructor() { throw new TypeError('Invalid base URL'); } };
      browser = require('pdfmake/build/' + bundle);
    } finally { global.URL = nativeURL; }
    browser.addVirtualFileSystem(require('pdfmake/build/vfs_fonts'));
    const dd = definition();
    dd.defaultStyle.font = 'Roboto';
    assert.equal(browser.validateDocument(dd).valid, true);
    check(await browser.createPdf(dd, { validation: true }).getBuffer());
  }
  console.log('Packed Node API, file output and both browser bundles passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
`;
	fs.writeFileSync(path.join(temp, 'consumer.cjs'), consumer);
	console.log(execFileSync(process.execPath, ['consumer.cjs'], { cwd: temp, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }));
	if (process.env.PDFMAKE_PACK_DEST) {
		const dest = path.resolve(process.env.PDFMAKE_PACK_DEST);
		fs.mkdirSync(dest, { recursive: true });
		fs.copyFileSync(path.join(temp, packed.filename), path.join(dest, packed.filename));
	}
} finally {
	fs.rmSync(temp, { recursive: true, force: true });
}
