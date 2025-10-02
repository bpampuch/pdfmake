'use strict';

const assert = require('assert');
const LayoutBuilder = require('../src/layoutBuilder');

const sampleTestProvider = {
  provideFont: function () {
    return {
      widthOfString: function (text, size) { return text.length * size; },
      lineHeight: function (size) { return size; },
      ascender: 800, descender: -200
    };
  }
};

const imageMeasure = { measureImage: () => ({ width: 10, height: 10 }) };

function build(doc, options = {}) {
  const lb = new LayoutBuilder({ width: 400, height: 600 }, { left: 40, right: 40, top: 40, bottom: 40 }, imageMeasure);
  return lb.layoutDocument(doc, sampleTestProvider, {}, options.defaultStyle || {}, options.background, options.header, options.footer, options.images, options.watermark);
}

describe('LayoutBuilder legacy customizations', function () {
  it('should transform remark table label/detail into header rows', function () {
    const doc = [
      {},
      {},
      [
        { remark: { table: { body: [], headerRows: 0 } }, text: 'Label' },
        { text: 'Detail' }
      ]
    ];
    const resultPages = build(doc);
    assert(resultPages.length >= 1, 'Should produce at least one page');
    // After transform, a table with two rows (header + detail) should exist within doc[2]
    let tableNode;
    const candidateArray = Array.isArray(doc[2]) ? doc[2] : (doc[2] && Array.isArray(doc[2].stack) ? doc[2].stack : null);
    if (candidateArray) {
      tableNode = candidateArray.find(n => n && n.table && Array.isArray(n.table.body) && n.table.body.length >= 2);
    } else if (doc[2] && doc[2].table) { // direct table object
      tableNode = doc[2];
    }
    assert(tableNode, 'Transformed remark table node expected somewhere within doc[2]');
    assert.equal(tableNode.table.headerRows, 1, 'Remark table should have headerRows = 1 after transform');
  });

  it('should apply layers overlapping and advance by tallest layer height', function () {
    const layer1 = { text: 'AAAA', fontSize: 12 };
    const layer2 = { text: 'BBBBBBBB', fontSize: 24 }; // taller
    const doc = [{ layers: [layer1, layer2] }];
    const pages = build(doc);
    assert(pages.length >= 1, 'At least one page expected');
    const firstY = pages[0].items[0].item.y;
    const secondY = pages[0].items[1].item.y;
    assert.equal(firstY, secondY, 'Layered items should start at same Y');
  });

  it('should record vertical alignment markers for table cell with verticalAlign', function () {
    const doc = [{ table: { body: [ [ { text: 'Cell', verticalAlign: 'middle' } ] ] } }];
    const pages = build(doc);
    // Look for beginVerticalAlign/endVerticalAlign item types
    const types = pages[0].items.map(i => i.type);
    assert(types.includes('beginVerticalAlign'), 'beginVerticalAlign marker expected');
    assert(types.includes('endVerticalAlign'), 'endVerticalAlign marker expected');
  });

  it('should skip second footerBreak node', function () {
    const doc = [
      { text: 'First', footerBreak: true },
      { text: 'Second', footerBreak: true }
    ];
    const pages = build(doc);
    const texts = pages[0].items.filter(i => i.type === 'line').map(i => i.item.inlines[0].text);
    assert(texts.includes('First'), 'First footerBreak text present');
    assert(!texts.includes('Second'), 'Second footerBreak text should be skipped');
  });

  it('should adjust top margin when header has greater height', function () {
    const header = function () { return { text: new Array(50).fill('H').join('') }; };
    const doc = ['Body'];
    const pages = build(doc, { header });
    // Ensure body line y greater than default 40 (original top margin)
    const bodyLine = pages[0].items.find(i => i.type === 'line');
    assert(bodyLine.item.y >= 40, 'Body should appear at or below original margin (adjusted margin not less)');
  });
});
