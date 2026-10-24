const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), text); };
for (const name of ['pdfmake', 'pdfmake.min']) write(`build/${name}.d.ts`, "import pdfmake = require('../types/browser');\nexport = pdfmake;\n");
write('js/index.d.ts', "import pdfmake = require('../types');\nexport = pdfmake;\n");
write('build/vfs_fonts.d.ts', "import type { TVirtualFileSystem } from '../types/interfaces';\ndeclare const files: TVirtualFileSystem;\nexport = files;\n");
for (const name of fs.readdirSync(path.join(root, 'build/fonts')).filter(name => name.endsWith('.js'))) write('build/fonts/' + name.replace(/\.js$/, '.d.ts'), "import type { TFontContainer } from '../../types/interfaces';\ndeclare const container: TFontContainer;\nexport = container;\n");
