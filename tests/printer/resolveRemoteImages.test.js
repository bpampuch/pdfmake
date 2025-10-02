/*
 * Tests for PdfPrinter.resolveRemoteImages and createPdfKitDocumentAsync
 * These tests mock global fetch to avoid real network calls.
 */
'use strict';

const assert = require('assert');
const path = require('path');
const PdfPrinter = require('../../src/printer');

// Minimal font descriptors (must exist in repo examples/fonts)
const fonts = {
  Roboto: {
    normal: path.join(__dirname, '../../examples/fonts/Roboto-Regular.ttf'),
    bold: path.join(__dirname, '../../examples/fonts/Roboto-Medium.ttf'),
    italics: path.join(__dirname, '../../examples/fonts/Roboto-Italic.ttf'),
    bolditalics: path.join(__dirname, '../../examples/fonts/Roboto-MediumItalic.ttf')
  }
};

function mockFetchSuccess(imageBuffer, contentType) {
  global.fetch = async (url, opts) => { // eslint-disable-line no-unused-vars
    return {
      ok: true,
      arrayBuffer: async () => imageBuffer,
      headers: { get: (h) => h === 'content-type' ? contentType : null }
    };
  };
}

function restoreFetch(original) {
  if (original) {
    global.fetch = original;
  } else {
    delete global.fetch;
  }
}

describe('PdfPrinter remote images', function() {
  this.timeout(5000);

  it('resolveRemoteImages converts http(s) URLs to data URLs', async () => {
    const printer = new PdfPrinter(fonts);
  // 1x1 transparent PNG
  const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=', 'base64');
    const originalFetch = global.fetch;
    mockFetchSuccess(pngBytes, 'image/png');

    const dd = { images: { pic: 'https://example.com/image.png' } };
    await printer.resolveRemoteImages(dd);

    assert.ok(/^data:image\/png;base64,/i.test(dd.images.pic), 'image should be converted to data URL');
    restoreFetch(originalFetch);
  });

  it('createPdfKitDocumentAsync resolves remote images before layout', async () => {
    const printer = new PdfPrinter(fonts);
  const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=', 'base64');
    const originalFetch = global.fetch;
    mockFetchSuccess(pngBytes, 'image/png');

    const dd = {
      images: { pic: 'https://example.com/image.png' },
      content: [ { image: 'pic', width: 50 } ]
    };

    const doc = await printer.createPdfKitDocumentAsync(dd);
    // internal pdfKitDoc should be defined
    assert.ok(doc, 'pdfKit document created');
    assert.ok(/^data:image\/png;base64,/.test(dd.images.pic), 'image converted before layout');
    // basic sanity: imageMeasure registry should have an entry after forcing measurement via end()
    doc.end();
    restoreFetch(originalFetch);
  });

  it('resolveRemoteImages swallows fetch errors', async () => {
    const printer = new PdfPrinter(fonts);
    const originalFetch = global.fetch;
    global.fetch = async () => { throw new Error('network'); };

    const dd = { images: { pic: 'https://example.com/image.png' } };
    await printer.resolveRemoteImages(dd); // should not throw
    // Since fetch failed, original URL remains
    assert.strictEqual(dd.images.pic, 'https://example.com/image.png');
    restoreFetch(originalFetch);
  });
});
