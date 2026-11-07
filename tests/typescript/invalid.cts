import pdfmake = require('pdfmake');
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
// @ts-expect-error Font size must be numeric.
const invalid: TDocumentDefinitions = { content: [{ text: 'Invalid', fontSize: 'large' }] };
// @ts-expect-error Resource policies must return synchronous booleans.
pdfmake.setUrlAccessPolicy(async () => true);
// @ts-expect-error 0.3 output is Promise-based, not callback-based.
pdfmake.createPdf({ content: ['Valid'] }).getBuffer(() => {});
void invalid;

// @ts-expect-error Whole-table alignment does not support justified text alignment.
const invalidTable: TDocumentDefinitions = { content: [{ tableAlignment: 'justify', table: { body: [['x']] } }] };
void invalidTable;

// @ts-expect-error Node output cannot download in a browser.
pdfmake.createPdf({ content: ['x'] }).download();
// @ts-expect-error Node entry cannot register browser VFS containers.
pdfmake.addVirtualFileSystem({});
const diagnostics = pdfmake.validateDocument({ content: [{ text: 'x' }] });
const valid: boolean = diagnostics.valid;
void valid;
// @ts-expect-error Caching must be configured with a boolean.
pdfmake.setUrlResourceCaching('yes');
// @ts-expect-error URL cache overrides must be booleans.
const invalidCache: TDocumentDefinitions = { content: ['x'], images: { logo: { url: 'https://example.com/logo.png', cache: 'yes' } } };
void invalidCache;
