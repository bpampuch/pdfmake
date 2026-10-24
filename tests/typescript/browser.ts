import pdfmake from 'pdfmake/build/pdfmake.js';
import vfs from 'pdfmake/build/vfs_fonts.js';
import minified from 'pdfmake/build/pdfmake.min.js';
import fontContainer from 'pdfmake/build/fonts/Roboto.js';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

pdfmake.addVirtualFileSystem(vfs);
pdfmake.addFontContainer(fontContainer);
const preflight: boolean = minified.validateDocument({ content: ['test'] }).valid;
void preflight;
const definition = { content: [{ text: 'TypeScript browser bundler', bold: true }] } satisfies TDocumentDefinitions;
export async function render(): Promise<Blob> {
  return pdfmake.createPdf(definition).getBlob();
}

// @ts-expect-error Browser output has no filesystem write method.
if (false) pdfmake.createPdf({ content: ['x'] }).write('x.pdf');
// @ts-expect-error Browser API has no Node local access policy.
if (false) pdfmake.setLocalAccessPolicy(() => true);
