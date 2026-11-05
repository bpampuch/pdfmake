import pdfmake from 'pdfmake';
import fonts from 'pdfmake/standard-fonts/Helvetica.js';
import type { TDocumentDefinitions } from 'pdfmake/interfaces.js';
import { strict as assert } from 'node:assert';

pdfmake.addFonts(fonts);
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy(name => name.startsWith('Helvetica'));
const definition: TDocumentDefinitions = { content: [{ table: { body: [['ESM', 'TypeScript'], ['Promise', 'Output']] } }], defaultStyle: { font: 'Helvetica' } };
const buffer: Buffer = await pdfmake.createPdf(definition).getBuffer();
assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
