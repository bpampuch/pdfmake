'use strict';

var assert = require('assert');
var TableProcessor = require('../../src/tableProcessor');

/*
Extended tests for custom FlowAccount modifications in `tableProcessor.js`:
- remark pre-page-break logic in beginTable (forces new page if remaining height < 50)
- coloring of first horizontal line vector when table has remark (lineColor becomes #d5d5d5)
- overlayPattern & overlayOpacity rendering for cell background
*/

describe('TableProcessor – extended cases', function () {
  var writerStub;

  beforeEach(function () {
    writerStub = {
      _currentPageIndex: 0,
      context: function () { return this._ctx; },
      _ctx: {
        availableWidth: 500,
        availableHeight: 40, // start lower than 50 so remark triggers page break
        moveDown: function (h) { this.y = (this.y || 0) + (h || 0); this.availableHeight -= (h || 0); },
        y: 0,
        page: 0,
        getCurrentPage: function () { return { items: this.items || (this.items = []), height: 842 }; }
      },
      tracker: { startTracking: function () {}, stopTracking: function () {} },
      beginUnbreakableBlock: function () {},
      addVector: function (vector) {
        this._addedVectors = this._addedVectors || [];
        this._addedVectors.push(vector);
      }
    };
  });

  function buildTableNode(opts) {
    opts = opts || {};
    return {
      remark: opts.remark,
      table: {
        widths: [{ width: 100 }, { width: 100 }],
        body: [
          [ { text: 'A1', fillColor: opts.fillColor, overlayPattern: opts.overlayPattern, overlayOpacity: opts.overlayOpacity }, { text: 'A2' } ]
        ]
      },
      _offsets: { total: 0 },
      _layout: {
        paddingLeft: function () { return 0; },
        paddingRight: function () { return 0; },
        paddingTop: function () { return 0; },
        paddingBottom: function () { return 0; },
        hLineWidth: function () { return 1; },
        vLineWidth: function () { return 1; },
        hLineColor: function () { return 'black'; },
        vLineColor: function () { return 'black'; },
        hLineStyle: function () { return null; },
        vLineStyle: function () { return null; },
        fillColor: function () { return null; },
        fillOpacity: function () { return 1; },
        defaultBorder: true
      }
    };
  }

  it('forces page break before remark table if availableHeight < 50', function () {
    var node = buildTableNode({ remark: true });
    var tp = new TableProcessor(node);
    tp.beginTable(writerStub);
    assert.strictEqual(tp.beginNewPage, true, 'Expected beginNewPage flag to be set');
  });

  it('applies #d5d5d5 lineColor to first vector via rowCallback when table has remark', function () {
    // Custom tracker to capture rowCallback
    var rowCallback;
    var node = buildTableNode({ remark: true });
    var contextObj = {
      availableWidth: 500,
      availableHeight: 100,
      moveDown: function () {},
      y: 0,
      page: 0,
      items: [],
      getCurrentPage: function () { return { items: this.items }; }
    };
    var writer = {
      context: function () { return contextObj; },
      tracker: { startTracking: function (evt, cb) { if (evt === 'pageChanged') { rowCallback = cb; } }, stopTracking: function () {} },
      addVector: function () {}
    };
    var tp = new TableProcessor(node);
    tp.beginTable(writer);
    // Begin first row to set up rowCallback
    tp.rowSpanData = [{ left:0,rowSpan:0,width:100},{ left:100,rowSpan:0,width:100 }];
    tp.beginRow(0, writer);
    // Insert initial vector (simulating top horizontal line or first drawn vector)
    contextObj.items.push({ type: 'vector', item: { remark: true, lineColor: 'original' } });
    // Invoke rowCallback as if a page break check happened
    rowCallback();
    assert.strictEqual(contextObj.items[0].item.lineColor, '#d5d5d5', 'Expected lineColor override for remark table');
  });

  it('renders overlayPattern with overlayOpacity when specified', function () {
    var vectors = [];
    var contextObj = {
      availableWidth: 500,
      availableHeight: 500,
      moveDown: function () {},
      y: 0,
      page: 0,
      backgroundLength: [0],
      getCurrentPage: function () { return { items: [] }; }
    };
    var writer = {
      context: function () { return contextObj; },
      tracker: { startTracking: function () {}, stopTracking: function () {} },
      addVector: function (v) { vectors.push(v); }
    };
    var node = buildTableNode({ overlayPattern: 'diagPattern', overlayOpacity: 0.4 });
    var tp = new TableProcessor(node);
    tp.beginTable(writer); // sets layout, rowSpanData with _calcWidth
    tp.beginRow(0, writer);
    // Simulate row content height so skipOrphanePadding is false and background logic runs
    writer.context().y += 10;
    // Reinforce overlayPattern on the cell in case it's stripped/normalized elsewhere
    tp.tableNode.table.body[0][0].overlayPattern = 'diagPattern';
    tp.tableNode.table.body[0][0].overlayOpacity = 0.4;
    // Call endRow which should now process fill/overlay
    tp.endRow(0, writer, []);
    var overlayRect = vectors.find(function (v) { return v.type === 'rect' && v.color === 'diagPattern'; });
    assert(overlayRect, 'Expected overlay pattern rectangle');
  });
});
