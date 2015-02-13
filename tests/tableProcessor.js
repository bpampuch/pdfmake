/* jslint node: true */
'use strict';

var assert = require('assert');
var TableProcessor = require('../src/tableProcessor');

var _ = {};
_.noop = function () {}; // TODO use lodash

describe('tableProcessor', function () {
  describe('header with nested table (issue #199)', function () {
    it('should not remove the repeatable of the outer table when nested table ends', function () {

      var fakeTableNode = function() {
        return {
          table: {
            widths: ['*']
          },
          _offsets: {
            total: 56472
          },
          _layout: {
            paddingLeft: _.noop,
            paddingRight: _.noop,
            paddingBottom: _.noop,
            paddingTop: _.noop,
            vLineWidth: _.noop,
            hLineWidth: _.noop
          }
        }
      };

      var header = {};
      var popFromRepeatablesCallCount = 0; // TODO use sinon spy

      var nestedTableNode = fakeTableNode();
      nestedTableNode.table.body = [['nested table cell']];

      var tableNode = fakeTableNode();
      tableNode.table.body = [
            ['Header'],
            [nestedTableNode]
          ];
      tableNode.table.headerRows = 1;

      var fakeWriter = {
        context: function() {
          return {
            availableWidth: 56473,
            moveDown: _.noop
          }
        },
        repeatables: [],
        tracker: {
          stopTracking: _.noop
        },
        addVector: _.noop,
        popFromRepeatables: function() {
          popFromRepeatablesCallCount++;
        },
        pushToRepeatables: function(repeatable) {
          assert.equal(repeatable, header);
        },
        beginUnbreakableBlock: _.noop,
        currentBlockToRepeatable: function() {
          return header;
        },
        commitUnbreakableBlock: _.noop
      };

      var pageBreaks = [];
      var tableProcessor = new TableProcessor(tableNode);
      tableProcessor.beginTable(fakeWriter);
      tableProcessor.endRow(0, fakeWriter, pageBreaks);

      var nestedTableProcessor = new TableProcessor(nestedTableNode);
      nestedTableProcessor.beginTable(fakeWriter);
      nestedTableProcessor.endRow(0, fakeWriter, pageBreaks);
      nestedTableProcessor.endTable(fakeWriter);
      assert.equal(popFromRepeatablesCallCount, 0);

      tableProcessor.endTable(fakeWriter);
      assert.equal(popFromRepeatablesCallCount, 1);
    });
  });
});