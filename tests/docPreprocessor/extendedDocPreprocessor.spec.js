'use strict';

const assert = require('assert');
const DocPreprocessor = require('../../src/docPreprocessor');

function run(doc) {
  const pre = new DocPreprocessor();
  return pre.preprocessDocument(doc);
}

describe('DocPreprocessor – extended cases', () => {
  it('casts primitive number and boolean to text nodes', () => {
    const result = run([123, true, false]);
    assert.equal(result.stack.length, 3);
    assert.deepEqual(result.stack.map(n => n.text), ['123', 'true', 'false']);
  });

  it('converts null and undefined to empty text nodes', () => {
    const result = run([null, undefined]);
    assert.equal(result.stack.length, 2);
    assert.deepEqual(result.stack.map(n => n.text), ['', '']);
  });

  it('normalizes empty object and text: null to empty string', () => {
    const result = run([{},{ text: null }]);
    assert.equal(result.stack.length, 2);
    assert.equal(result.stack[0].text, '');
    assert.equal(result.stack[1].text, '');
  });

  it('processes nested columns and stacks', () => {
    const doc = { columns: [ 'A', { stack: ['B', 'C'] } ] };
    const node = run(doc);
    assert.equal(node.columns[0].text, 'A');
    assert.equal(node.columns[1].stack[0].text, 'B');
  });

  it('handles table with null cell and leaves span markers', () => {
    const table = { table: { body: [ [ { text: 'A' }, null, { text: 'B' } ] ] } };
    const node = run(table);
    assert.equal(node.table.body[0][1].text, '');
  });

  it('creates page reference placeholder and links it', () => {
    const result = run([{ text: 'See page', pageReference: 'dest1' }]);
    const refNode = result.stack[0];
    assert.equal(refNode.text, '00000');
    assert.equal(refNode.linkToDestination, 'dest1');
    assert.ok(refNode._pageRef, 'page reference stored');
  });

  it('creates text reference placeholder and links it', () => {
    const result = run([{ text: 'Anchor', id: 'anchor1' }, { textReference: 'anchor1' }]);
    assert.equal(result.stack[1].text, '');
    assert.equal(result.stack[1].linkToDestination, 'anchor1');
    assert.ok(result.stack[1]._textRef, 'text reference stored');
  });

  it('throws on duplicate non-pseudo id within the same document', () => {
    const pre = new DocPreprocessor();
    assert.throws(() => pre.preprocessDocument([{ id: 'dup', text: 'A' }, { id: 'dup', text: 'B' }]), /already exists/);
  });

  it('assigns ids to tocItem entries and builds toc structure', () => {
    const doc = [ { toc: {} }, { text: 'H1', tocItem: true } ];
    const result = run(doc);
    const toc = result.stack[0];
    assert.equal(toc.toc._items.length, 1);
    assert.equal(result.stack[1].id, 'toc-_default_-0');
  });
});
