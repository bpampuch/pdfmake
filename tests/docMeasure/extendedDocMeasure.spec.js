'use strict';

const assert = require('assert');
const DocMeasure = require('../../src/docMeasure');
const DocPreprocessor = require('../../src/docPreprocessor');

// Fake font provider with deterministic metrics
const fontProvider = {
  provideFont: function () {
    return {
      widthOfString: (text, size) => text.length * size,
      lineHeight: (size) => size * 1.2
    };
  }
};

// Simple imageMeasure stub
const imageMeasure = {
  measureImage: (label) => {
    switch (label) {
      case 'small': return { width: 50, height: 25 };
      case 'portrait': return { width: 200, height: 400 };
      case 'landscape': return { width: 400, height: 200 };
      default: return { width: 300, height: 300 };
    }
  }
};

// SVG measure stub (reuse image logic)
const svgMeasure = {
  measureSVG: () => ({ width: 120, height: 60 }),
  writeDimensions: (svg) => svg // not needed for assertion of width/height values
};

// no custom table layouts for this suite
const tableLayouts = {};

function newMeasure(extraStyles, defaultStyle, imagesStore) {
  return new DocMeasure(fontProvider, extraStyles || {}, defaultStyle || {}, imageMeasure, svgMeasure, tableLayouts, imagesStore || {});
}

function preprocess(doc) {
  const pre = new DocPreprocessor();
  return pre.preprocessDocument(doc);
}

describe('DocMeasure – extended cases', () => {
  describe('measureImage / measureImageWithDimensions', () => {
    it('applies explicit width and proportional height when width only provided', () => {
      const dm = newMeasure();
      const node = preprocess({ image: 'small', width: 100 });
      dm.measureNode(node);
      assert.equal(node._width, 100);
      // original small is 50x25 => aspect 2:1 so height should become 50
      assert.equal(Math.round(node._height), 50);
    });

    it('respects explicit width and height (stretch)', () => {
      const dm = newMeasure();
      const node = preprocess({ image: 'small', width: 120, height: 90 });
      dm.measureNode(node);
      assert.equal(node._width, 120);
      assert.equal(node._height, 90);
    });

    it('scales with fit to contain entire landscape image', () => {
      const dm = newMeasure();
      const node = preprocess({ image: 'landscape', fit: [200, 200] });
      dm.measureNode(node);
      // landscape dimensions 400x200 -> scale factor min(200/400, 200/200)=0.5 => 200x100
      assert.equal(node._width, 200);
      assert.equal(node._height, 100);
    });

    it('scales with fit to contain entire portrait image', () => {
      const dm = newMeasure();
      const node = preprocess({ image: 'portrait', fit: [200, 200] });
      dm.measureNode(node);
      // portrait dimensions 200x400 -> factor min(200/200, 200/400)=0.5 => 100x200 (note logic chooses smaller to fit)
      assert.equal(node._width, 100);
      assert.equal(node._height, 200);
    });

    it('applies cover dimensions directly', () => {
      const dm = newMeasure();
      const node = preprocess({ image: 'landscape', cover: { width: 150, height: 90 } });
      dm.measureNode(node);
      assert.equal(node._width, 150);
      assert.equal(node._height, 90);
      assert.equal(node._minWidth, 150);
      assert.equal(node._maxWidth, 150);
    });

    it('enforces maxWidth and adjusts height proportionally', () => {
      const dm = newMeasure();
      const node = preprocess({ image: 'landscape', maxWidth: 100 });
      dm.measureNode(node);
      // original 400x200 -> width clamped to 100 => height scaled to 50
      assert.equal(node._width, 100);
      assert.equal(node._height, 50);
    });

    it('enforces maxHeight and adjusts width proportionally', () => {
      const dm = newMeasure();
      const node = preprocess({ image: 'portrait', maxHeight: 120 });
      dm.measureNode(node);
      // original 200x400 -> height clamped 120 => width scaled * (200/400)=0.5 => 60x120
      assert.equal(node._height, 120);
      assert.equal(node._width, 60);
    });

    it('enforces minWidth and adjusts height proportionally', () => {
      const dm = newMeasure();
      const node = preprocess({ image: 'small', minWidth: 200 });
      dm.measureNode(node);
      // original 50x25 -> expand width 200 => height 100
      assert.equal(node._width, 200);
      assert.equal(node._height, 100);
    });

    it('enforces minHeight and adjusts width proportionally', () => {
      const dm = newMeasure();
      const node = preprocess({ image: 'small', minHeight: 120 });
      dm.measureNode(node);
      // original 50x25 -> expand height 120 => scale = 120/25 = 4.8 => width 240
      assert.equal(node._height, 120);
      assert.equal(node._width, 240);
    });

    it('inherits alignment from style stack', () => {
      const dm = newMeasure({ centerImg: { alignment: 'center' } });
      const node = preprocess({ image: 'small', style: 'centerImg' });
      dm.measureNode(node);
      assert.equal(node._alignment, 'center');
    });

    it('converts base64 images to label and stores in images map', () => {
      const imagesStore = {};
      const dm = newMeasure({}, {}, imagesStore);
      const base64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
      const node = preprocess({ image: base64 });
      dm.measureNode(node);
      assert(/^\$\$pdfmake\$\$/.test(node.image));
      assert(imagesStore[node.image]);
    });
  });

  describe('measureSVG uses image sizing logic', () => {
    it('derives width/height and alignment', () => {
      const dm = newMeasure({ mid: { alignment: 'right' } });
      const node = preprocess({ svg: '<svg></svg>', style: 'mid' });
      dm.measureNode(node);
      assert.equal(node._width, 120);
      assert.equal(node._height, 60);
      assert.equal(node._alignment, 'right');
    });
  });

  describe('list sizing gap recalculation', () => {
    it('expands ordered list gap width when marker wider than initial', () => {
      const dm = newMeasure({}, { fontSize: 12 });
      // Second item custom counter forces wider marker text (e.g., "100.")
      const node = preprocess({ ol: [ 'a', { text: 'b', counter: 100 }, 'c' ] });
      dm.measureNode(node);
      // Ensure listMarker width for large counter equals node._gapSize.width
      const largeMarker = node.ol[1].listMarker._inlines[0];
      assert.equal(largeMarker.width, node._gapSize.width);
    });

    it('unordered list assigns marker objects only to leaf items', () => {
      const dm = newMeasure();
      const node = preprocess({ ul: [ 'a', { ul: ['nested'] }, 'c' ] });
      dm.measureNode(node);
      assert(node.ul[0].listMarker); // leaf
      assert(!node.ul[1].listMarker); // nested list container
      assert(node.ul[2].listMarker); // leaf
    });
  });

  describe('margin application extension logic', () => {
    it('adds horizontal margins to min/max width during measureNode', () => {
      const dm = newMeasure({ spaced: { margin: [10, 0, 15, 0] } });
      const node = preprocess({ text: 'abc', style: 'spaced' });
      const measured = dm.measureNode(node);
      // Text width: minWidth = maxWidth = 3 * 12 (fontSize default 12) => 36 + margins 10 + 15 = 61
      assert.equal(measured._minWidth, 36 + 10 + 15);
      assert.equal(measured._maxWidth, 36 + 10 + 15);
    });
  });
});
