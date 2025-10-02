'use strict';

const assert = require('assert');
const DocumentContext = require('../../src/documentContext');

function newCtx(pageSize) {
  return new DocumentContext(pageSize || { width: 600, height: 800, orientation: 'portrait' }, { left: 40, right: 40, top: 50, bottom: 60 });
}

describe('DocumentContext – extended cases', () => {
  describe('beginColumnGroup with marginXTopParent', () => {
    it('stores marginXTopParent and reduces availableWidth on first snapshot page', () => {
      const ctx = newCtx();
      const initialAvail = ctx.availableWidth; // 600 - 40 - 40 = 520
      ctx.beginColumnGroup([30, 20]);
      // simulate a change that would cause initializePage to recompute using marginXTopParent
      ctx.initializePage();
      // width reduction is applied to the snapshot context, not root ctx when a column group is active
      const snap = ctx.snapshots[0];
      assert.equal(snap.availableWidth, initialAvail - 30 - 20);
    });
  });

  describe('updateBottomByPage tracking', () => {
    it('records maximum y reached per page within current column group', () => {
      const ctx = newCtx();
      ctx.beginColumnGroup();
      const startY = ctx.y;
      ctx.y += 100; // move down
      ctx.updateBottomByPage();
      ctx.y += 50; // further down
      ctx.updateBottomByPage();
      const snap = ctx.snapshots[ctx.snapshots.length - 1];
      assert.equal(snap.bottomByPage[ctx.page], startY + 150); // includes initial offset (pageMargins.top)
    });
  });

  describe('bottomMost context across pages in column groups', () => {
    it('selects later page as bottomMost even with lower y', () => {
      const ctx = newCtx();
      ctx.beginColumnGroup();
      const firstPage = ctx.page;
      ctx.y += ctx.availableHeight + 10; // force next page
      ctx.moveToNextPage();
      // ensure y resets and availableHeight recomputed
      assert(ctx.page > firstPage);
      const snap = ctx.snapshots[ctx.snapshots.length - 1];
      // bottomMost should adopt later page even with smaller y
      ctx.completeColumnGroup();
      // After completion, ctx.page should be updated to bottomMost.page (second page)
      assert.equal(ctx.page, snap.bottomMost.page);
    });
  });

  describe('markEnding restores column-ending context', () => {
    it('restores saved context with offset and discountY', () => {
      const ctx = newCtx();
      ctx.beginColumnGroup();
      // emulate column start
      ctx.beginColumn(200, 0, null);
      const endingCell = {};
      ctx.saveContextInEndingCell(endingCell);
      // modify current context
      ctx.x += 50; ctx.y += 120; ctx.availableWidth -= 30; ctx.availableHeight -= 200; ctx.lastColumnWidth = 123;
      ctx.markEnding(endingCell, 15, 10);
      assert.equal(ctx.x, endingCell._columnEndingContext.x + 15);
      assert.equal(ctx.y, endingCell._columnEndingContext.y - 10);
      assert.equal(ctx.availableWidth, endingCell._columnEndingContext.availableWidth);
      assert.equal(ctx.lastColumnWidth, endingCell._columnEndingContext.lastColumnWidth);
    });
  });

  describe('moveToNextPage preserves availableWidth when orientation unchanged', () => {
    it('keeps availableWidth for same orientation and resets y', () => {
      const ctx = newCtx();
      const widthBefore = ctx.availableWidth;
      ctx.y = ctx.pageMargins.top + ctx.availableHeight - 5; // near bottom
      const res = ctx.moveToNextPage();
      assert(res.newPageCreated);
      assert.equal(ctx.availableWidth, widthBefore);
      assert.equal(ctx.y, ctx.pageMargins.top);
    });
  });

  describe('moveToNextPage adjusts page size on orientation change', () => {
    it('swaps width/height and keeps current availableWidth only if same orientation', () => {
      const ctx = newCtx({ width: 600, height: 400, orientation: 'portrait' });
      const res1 = ctx.moveToNextPage('landscape');
      assert(res1.newPageCreated);
      // landscape page size should have width = previous height (400) & height = previous width (600)
      const page = ctx.getCurrentPage();
      assert.equal(page.pageSize.orientation, 'landscape');
      assert.equal(page.pageSize.width, 400);
      assert.equal(page.pageSize.height, 600);
      // availableWidth recomputed for new orientation (400 - margins)
      assert.equal(ctx.availableWidth, 400 - 40 - 40);
      // Next page with same orientation keeps availableWidth
      const widthNow = ctx.availableWidth;
      ctx.y = ctx.pageMargins.top + ctx.availableHeight - 1; // trigger page break
      ctx.moveToNextPage('landscape');
      assert.equal(ctx.availableWidth, widthNow);
    });
  });
});
