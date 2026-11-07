import pdfmake = require('pdfmake');
import type { TDocumentDefinitions } from 'pdfmake';
import { strict as assert } from 'node:assert';

pdfmake.addFonts({ Helvetica: { normal: 'Helvetica', bold: 'Helvetica-Bold', italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique' } });
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setUrlResourceCaching(false);
pdfmake.clearUrlResourceCache();
pdfmake.addFonts({ Binary: { normal: new Uint8Array([0]), bold: new ArrayBuffer(1), italics: Buffer.from([0]), bolditalics: [new Uint8Array([0]), 'Face'] } });
const resources = { content: ['Resource types'], images: { raw: new Uint8Array([0]), buffer: Buffer.from([0]), array: new ArrayBuffer(1), remote: { url: 'https://example.com/logo.png', cache: false } }, attachments: { report: { src: { url: 'https://example.com/report.pdf', cache: true } } }, files: { report: { src: { url: 'https://example.com/report.pdf', cache: false } } } } satisfies TDocumentDefinitions;
assert.equal(pdfmake.validateDocument(resources, { strict: true }).valid, true);
pdfmake.setLocalAccessPolicy(name => name.startsWith('Helvetica'));
const definition = { content: [{ text: 'TypeScript CommonJS', fontSize: 18 }, { tableAlignment: 'center', table: { body: [['TypeScript', '0.3.13']] } }], defaultStyle: { font: 'Helvetica' } } satisfies TDocumentDefinitions;
async function main() {
  const output = pdfmake.createPdf(definition);
  const buffer: Buffer = await output.getBuffer();
  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
  await pdfmake.createPdf({ content: ['File'], defaultStyle: { font: 'Helvetica' } }).write('typescript.pdf');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
