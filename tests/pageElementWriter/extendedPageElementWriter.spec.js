const assert = require('assert');
const sinon = require('sinon');

const PageElementWriter = require('../../src/pageElementWriter');
const DocumentContext = require('../../src/documentContext');

// helpers similar to existing tests
function createSimpleDocContext(pageSize) {
  const size = pageSize || { width: 200, height: 200, orientation: 'portrait' }; // small page to force breaks
  const pageMargins = { left: 40, right: 40, top: 40, bottom: 40 };
  return new DocumentContext(size, pageMargins);
}

function fragment(height, width) {
  return {
    xOffset: 0,
    yOffset: 0,
    width: width || 100,
    height: height,
    items: [] // empty content sufficient for spacing logic
  };
}

describe('extended PageElementWriter footer & fragment behavior', function () {
  it('should retry footer type 2 on new page when it does not fit initially', function () {
    const docContext = createSimpleDocContext();
  const tracker = { emit: function(){} };
  const pew = new PageElementWriter(docContext, tracker);
    const moveSpy = sinon.spy(pew, 'moveToNextPage');

    // consume almost all available height leaving 5px
    docContext.moveDown(115); // availableHeight now 5
    const result = pew.addFragment(fragment(25), false, false, false, 2);
    assert.strictEqual(result, true, 'type 2 footer should be added after page break');
    assert.strictEqual(moveSpy.calledOnce, true, 'one page break expected');
  });

  it('should keep footer type 1 on same page when it fits', function () {
    const docContext = createSimpleDocContext();
  const tracker = { emit: function(){} };
  const pew = new PageElementWriter(docContext, tracker);
    const moveSpy = sinon.spy(pew, 'moveToNextPage');

    // consume 80 (out of 120) leaving 40
    docContext.moveDown(80);
    pew.addFragment(fragment(30), false, false, false, 1);
    assert.strictEqual(moveSpy.called, false, 'no page break expected');
  });

  it('should move to next page when footer type 1 does not fit', function () {
    const docContext = createSimpleDocContext();
  const tracker = { emit: function(){} };
  const pew = new PageElementWriter(docContext, tracker);
    const moveSpy = sinon.spy(pew, 'moveToNextPage');

    docContext.moveDown(115); // leave 5
    const res = pew.addFragment(fragment(25), false, false, false, 1);
    assert.strictEqual(res, false, 'primary footer returns false when moved');
    assert.strictEqual(moveSpy.calledOnce, true, 'page break expected');
  });

  it('should force page break and retry for non-footer fragment', function () {
    const docContext = createSimpleDocContext();
  const tracker = { emit: function(){} };
  const pew = new PageElementWriter(docContext, tracker);
    const moveSpy = sinon.spy(pew, 'moveToNextPage');

    docContext.moveDown(115); // leave 5
    pew.addFragment(fragment(30));
    assert.strictEqual(moveSpy.calledOnce, true, 'non-footer fragment should trigger page break');
  });
});
