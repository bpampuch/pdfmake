import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export async function prepareTypeScript(output, { transform } = {}) {
  const modules = path.dirname(path.dirname(require.resolve('typescript/package.json')));
  const source = path.join(modules, 'typescript/lib/typescript.js');
  if (transform) {
    const result = await transform(await fs.readFile(source, 'utf8'), { minify: true, legalComments: 'eof', target: 'es2020' });
    await fs.writeFile(path.join(output, 'typescript.js'), result.code);
  } else await fs.copyFile(source, path.join(output, 'typescript.js'));
  const licenses = [];
  for (const name of ['typescript/LICENSE.txt', 'typescript/ThirdPartyNoticeText.txt', '@types/pdfkit/LICENSE', '@types/node/LICENSE', 'undici-types/LICENSE']) {
    const text = await fs.readFile(path.join(modules, name), 'utf8').catch(() => '');
    if (text) licenses.push(name + '\n\n' + text);
  }
  const native = await nativeLibrary();
  licenses.push('pdfmake/types/LICENSE\n\n' + await fs.readFile(path.join(native, 'types/LICENSE'), 'utf8'));
  await fs.writeFile(path.join(output, 'TYPESCRIPT-LICENSES.txt'), licenses.join('\n\n---\n\n'));
  await fs.writeFile(path.join(output, 'typescript-types.js'), 'var pdfmakeTypeFiles = ' + JSON.stringify(await collectTypeFiles()) + ';\n');
}
export async function collectTypeFiles() {
  const modules = path.dirname(path.dirname(require.resolve('typescript/package.json')));
  const files = {};
  async function collect(directory, base = modules, prefix = '/node_modules/') {
    for (const item of await fs.readdir(directory, { withFileTypes: true }).catch(() => [])) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) await collect(file, base, prefix);
      else if (item.name.endsWith('.d.ts') || item.name === 'package.json') files[prefix + path.relative(base, file).replaceAll('\\', '/')] = await fs.readFile(file, 'utf8');
    }
  }
  for (const name of ['typescript/lib', '@types', 'undici-types']) await collect(path.join(modules, name));
  const native = await nativeLibrary();
  for (const name of ['types', 'build']) {
    if (name === 'types') await collect(path.join(native, name), native, '/node_modules/pdfmake/');
    else for (const file of ['pdfmake.d.ts', 'pdfmake.min.d.ts', 'vfs_fonts.d.ts']) files['/node_modules/pdfmake/build/' + file] = await fs.readFile(path.join(native, name, file), 'utf8');
  }
  for (const file of ['package.json', 'interfaces.d.ts']) files['/node_modules/pdfmake/' + file] = await fs.readFile(path.join(native, file), 'utf8');
  return files;
}

async function nativeLibrary() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  let installed;
  try { installed = path.dirname(require.resolve('pdfmake/package.json')); } catch { /* The library checkout itself is also supported. */ }
  const candidates = [process.env.PDFMAKE_SOURCE, root, installed, path.join(root, 'tooling/pdfmake-types')].filter(Boolean);
  for (const candidate of candidates) if (await fs.stat(path.join(candidate, 'types/interfaces.d.ts')).catch(() => null)) return candidate;
  throw new Error('Native declarations are missing. Run sync-native-types against the built library.');
}
