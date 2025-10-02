'use strict';

const assert = require('assert');
const ElementWriter = require('../../src/elementWriter');
const DocumentContext = require('../../src/documentContext');
const Line = require('../../src/line');

function makeCtx() {
  return new DocumentContext({ width: 600, height: 800, orientation: 'portrait' }, { left: 40, right: 40, top: 50, bottom: 60 });
}

function makeWriter() {
  const ctx = makeCtx();
  const tracker = { emit: () => {} };
  return { writer: new ElementWriter(ctx, tracker), ctx };
}

describe('ElementWriter – extended cases', () => {
  describe('addImage behavior', () => {
    it('returns false when image taller than remaining height and not first item', () => {
      const { writer, ctx } = makeWriter();
      // Add dummy line to occupy first spot
      const line = new Line(200);
      line.addInline({ width: 10, height: 12, alignment: 'left' });
      writer.addLine(line);
      const bigImage = { _height: ctx.availableHeight + 1, _minWidth: 50, _alignment: 'left' };
      const res = writer.addImage(bigImage);
      assert.equal(res, false);
    });

    it('adds image when enough space and moves context.y', () => {
      const { writer, ctx } = makeWriter();
      const startY = ctx.y;
      const img = { _height: 100, _minWidth: 80, _alignment: 'left' };
      const pos = writer.addImage(img);
      assert(pos);
      assert.equal(ctx.y, startY + 100);
      const pageItems = ctx.getCurrentPage().items.filter(i => i.type === 'image');
      assert.equal(pageItems.length, 1);
    });

    it('applies center alignment offset', () => {
      const { writer, ctx } = makeWriter();
      const avail = ctx.availableWidth; // 600 - 80 = 520
      const img = { _height: 50, _minWidth: 100, _alignment: 'center' };
      writer.addImage(img);
      // x should be context.x + (avail - 100)/2
      assert.equal(img.x, ctx.x + (avail - 100) / 2);
    });
  });

  describe('alignLine justification', () => {
    it('distributes justify spacing across inlines', () => {
      const { writer, ctx } = makeWriter();
      const l = new Line(1000);
      // create 3 inlines wide total 60
      l.addInline({ width: 10, height: 12, alignment: 'justify', text: 'a' });
      l.addInline({ width: 20, height: 12, text: 'b', x: 10 });
      l.addInline({ width: 30, height: 12, text: 'c', x: 30 });
      writer.alignLine(l);
      const totalWidth = l.getWidth();
      const gap = ctx.availableWidth - totalWidth;
      const expectedShift = gap / (l.inlines.length - 1);
      assert.equal(l.inlines[1].justifyShift, expectedShift);
      assert.equal(l.inlines[2].justifyShift, expectedShift);
      assert.equal(l.inlines[1].x, 10 + expectedShift);
      assert.equal(l.inlines[2].x, 30 + expectedShift * 2);
    });
  });

  describe('addFragment', () => {
    it('returns false when block taller than availableHeight (unless X offset usage)', () => {
      const { writer, ctx } = makeWriter();
      const block = { height: ctx.availableHeight + 1, items: [] };
      const res = writer.addFragment(block, false, false, false);
      assert.equal(res, false);
    });

    it('inserts vectors with fillColor at background boundary index', () => {
      const { writer, ctx } = makeWriter();
      // simulate page with some background items length 0
      const vector = { type: 'vector', item: { x: 0, y: 0, _isFillColorFromUnbreakable: true } };
      const block = { height: 10, items: [ vector ] };
      writer.addFragment(block, true, true, true);
      const pageItems = ctx.getCurrentPage().items;
      // inserted at index backgroundLength[page] which is 0
      assert.equal(pageItems[0].item._isFillColorFromUnbreakable, undefined);
    });

    it('updates context position unless dontUpdateContextPosition', () => {
      const { writer, ctx } = makeWriter();
      const startY = ctx.y;
      const block = { height: 25, items: [] };
      writer.addFragment(block, false, false, false);
      assert.equal(ctx.y, startY + 25);
      const startY2 = ctx.y;
      writer.addFragment(block, false, false, true);
      assert.equal(ctx.y, startY2); // unchanged when dontUpdateContextPosition = true
    });

    it('moves down to bottom for footer fragments (isFooter) before placing', () => {
      const { writer, ctx } = makeWriter();
      const before = ctx.y;
      const block = { height: 40, items: [] };
      writer.addFragment(block, false, false, false, true);
      // context moved to bottom - block.height
      const expectedY = ctx.pageMargins.top + ctx.fullHeight - block.height;
      assert.equal(before <= expectedY, true);
      assert.equal(ctx.y, expectedY + block.height); // after placing, y advanced by height
    });
  });

  describe('pushContext/popContext', () => {
    it('creates nested context for unbreakable blocks and restores it', () => {
      const { writer, ctx } = makeWriter();
      const originalAvail = ctx.availableWidth;
      writer.pushContext();
      assert.notEqual(writer.context, ctx);
      writer.popContext();
      assert.equal(writer.context, ctx);
      assert.equal(ctx.availableWidth, originalAvail);
    });
  });

  describe('vertical align markers', () => {
    it('adds beginVerticalAlign and endVerticalAlign items', () => {
      const { writer, ctx } = makeWriter();
      const page = ctx.getCurrentPage();
      writer.beginVerticalAlign('middle');
      writer.endVerticalAlign('middle');
      const types = page.items.slice(-2).map(i => i.type);
      assert.deepEqual(types, ['beginVerticalAlign', 'endVerticalAlign']);
    });
  });
});
