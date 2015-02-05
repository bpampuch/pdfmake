/* jslint node: true */
'use strict';
var assert = require('assert');

var TableProcessor = require('../src/tableProcessor');

describe('TableProcessor', function () {

  function noop(){}

  var defaultLayout, contextFake, writerFake;


  beforeEach(function(){
    defaultLayout = {
      hLineWidth: function (i, node) {
        return 1;
      }, //return node.table.headerRows && i === node.table.headerRows && 3 || 0; },
      vLineWidth: function (i, node) {
        return 1;
      },
      hLineColor: function (i, node) {
        return 'black';
      },
      vLineColor: function (i, node) {
        return 'black';
      },
      paddingLeft: function (i, node) {
        return 4;
      }, //i && 4 || 0; },
      paddingRight: function (i, node) {
        return 4;
      }, //(i < node.table.widths.length - 1) ? 4 : 0; },
      paddingTop: function (i, node) {
        return 2;
      },
      paddingBottom: function (i, node) {
        return 2;
      }
    };

    contextFake = {
      moveDown: noop
    };

    writerFake = {
      context: function () {
        return contextFake;
      },
      addVector : function(vector, ignoreContextX, ignoreContextY, index){
        assert.equal(vector.lineColor, 'nice shiny color');
        addVectorCallCount ++;
      },
      tracker: {
        startTracking: noop,
        stopTracking: noop
      }
    };

  })


  it('should use the line colors function (regression #161)', function () {

    var addVectorCallCount = 0;

    writerFake.addVector = function(vector){
      assert.equal(vector.lineColor, 'nice shiny color');
      addVectorCallCount ++;
    };


    var tableNode = {
      table: {
        body: [
          ['A1', 'A2'],
          ['B1', 'B2']
        ]
      }
    };

    var processor = new TableProcessor(tableNode);
    defaultLayout.vLineColor = function() {return 'nice shiny color'};
    defaultLayout.hLineColor = function() {return 'nice shiny color'};
    processor.layout = defaultLayout;
    processor.rowSpanData = [{ left: 0, rowSpan: 0 }, { left: 0, rowSpan: 0 }]

    processor.beginRow(0, writerFake);
    processor.endRow(0, writerFake, []);

    assert.equal(addVectorCallCount, 4)
  });

  it('should use the line colors constants (regression #161)', function () {

    var addVectorCallCount = 0;

    writerFake.addVector = function(vector){
      assert.equal(vector.lineColor, 'nice shiny color');
      addVectorCallCount ++;
    };


    var tableNode = {
      table: {
        body: [
          ['A1', 'A2'],
          ['B1', 'B2']
        ]
      }
    };

    var processor = new TableProcessor(tableNode);
    defaultLayout.vLineColor = 'nice shiny color';
    defaultLayout.hLineColor = 'nice shiny color';
    processor.layout = defaultLayout;
    processor.rowSpanData = [{ left: 0, rowSpan: 0 }, { left: 0, rowSpan: 0 }]

    processor.beginRow(0, writerFake);
    processor.endRow(0, writerFake, []);

    assert.equal(addVectorCallCount, 4)
  });


});