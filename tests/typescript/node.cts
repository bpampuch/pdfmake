import pdfmake = require('pdfmake');
import type { TDocumentDefinitions } from 'pdfmake';
import { strict as assert } from 'node:assert';

pdfmake.addFonts({ Helvetica: { normal: 'Helvetica', bold: 'Helvetica-Bold', italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique' } });
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy(name => name.startsWith('Helvetica'));
const definition = { content: [{ text: 'TypeScript CommonJS', fontSize: 18 }, { tableAlignment: 'center', table: { body: [['TypeScript', '0.3.13']] } }], defaultStyle: { font: 'Helvetica' } } satisfies TDocumentDefinitions;
async function main() {
  const output = pdfmake.createPdf(definition);
  const buffer: Buffer = await output.getBuffer();
  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
  await pdfmake.createPdf({ content: ['File'], defaultStyle: { font: 'Helvetica' } }).write('typescript.pdf');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
