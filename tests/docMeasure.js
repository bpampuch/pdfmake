/* jslint node: true */
'use strict';

var assert = require('assert');

var DocPreprocessor = require('../src/docPreprocessor');
var DocMeasure = require('../src/docMeasure');
var StyleContextStack = require('../src/styleContextStack');

var sampleTestProvider = {
	provideFont: function (familyName, bold, italics) {
		return {
			widthOfString: function (text, size) {
				return text.length * size * (bold ? 1.5 : 1) * (italics ? 1.1 : 1);
			},
			lineHeight: function (size) {
				return size;
			}
		};
	}
};

var emptyTableLayout = {
	hLineWidth: function (i) {
		return 0;
	},
	vLineWidth: function (i) {
		return 0;
	},
	hLineColor: function (i) {
		return 'black';
	},
	vLineColor: function (i) {
		return 'black';
	},
	paddingLeft: function (i) {
		return 0;
	},
	paddingRight: function (i) {
		return 0;
	},
	paddingTop: function (i) {
		return 0;
	},
	paddingBottom: function (i) {
		return 0;
	}
};

var docMeasure = new DocMeasure(sampleTestProvider);
var docPreprocessor = new DocPreprocessor();

describe('DocMeasure', function () {
	describe('measureLeaf', function () {
		it('should call textTools.buildInlines and set _inlines, _minWidth, _maxWidth and return node', function (done) {
			var dm = new DocMeasure(sampleTestProvider);
			var called = false;
			var node = {text: 'abc'};

			dm.textTools = {
				buildInlines: function () {
					called = true;
					return {items: ['abc'], minWidth: 1, maxWidth: 10};
				}
			};

			docPreprocessor.preprocessText(node);
			dm.measureLeaf(node, function(err, result) {
        if (err) {
          return done(err);
        }
        assert(called);
        assert(node._inlines);
        assert(node._minWidth);
        assert(node._maxWidth);

        assert.equal(node._inlines.length, 1);
        assert.equal(node._minWidth, 1);
        assert.equal(node._maxWidth, 10);

        assert.equal(node, result);
        done();
      });
		});
	});

	describe('measureColumns', function () {
		it('should extend document-definition-object if text columns are used', function (done) {
			var node = {columns: ['asdasd', 'bbbb']};
			docPreprocessor.preprocessColumns(node);
			docMeasure.measureColumns(node, function(err, result) {
        if (err) {
          return done(err);
        }
			  assert(result.columns[0]._minWidth);
			  assert(result.columns[0]._maxWidth);
        done();
      });
		});

		it('should calculate _minWidth and _maxWidth of all columns', function (done) {
			var node = {columns: ['this is a test', 'another one']};
			docPreprocessor.preprocessColumns(node);
			docMeasure.measureColumns(node, function(err, result) {
        if (err) {
          return done(err);
        }
        assert.equal(result.columns[0]._minWidth, 4 * 12);
        assert.equal(result.columns[0]._maxWidth, 14 * 12);
        assert.equal(result.columns[1]._minWidth, 7 * 12);
        assert.equal(result.columns[1]._maxWidth, 11 * 12);
        done();
      });
		});

		it('should set _minWidth and _maxWidth to the sum of inner min/max widths', function (done) {
			var node = {columns: [{text: 'this is a test', width: 'auto'}, {text: 'another one', width: 'auto'}], columnGap: 0};
			docPreprocessor.preprocessColumns(node);
			docMeasure.measureColumns(node, function(err, result) {
        if (err) {
          return done(err);
        }
			  assert.equal(node._minWidth, 4 * 12 + 7 * 12);
			  assert.equal(node._maxWidth, 14 * 12 + 11 * 12);
        done();
      });
		});

		it('should set _minWidth and _maxWidth properly when star columns are defined', function (done) {
			var node = {columns: ['this is a test', 'another one'], columnGap: 0};
			docPreprocessor.preprocessColumns(node);
			docMeasure.measureColumns(node, function(err, result) {
        if (err) {
          return done(err);
        }
        assert.equal(node._minWidth, 7 * 12 + 7 * 12);
        assert.equal(node._maxWidth, 14 * 12 + 14 * 12);
        done();
      });
		});

	});

	describe('measureVerticalContainer', function () {
		it('should extend document-definition-object if text paragraphs are used', function (done) {
			var node = {stack: ['asdasd', 'bbbb']};
			docPreprocessor.preprocessVerticalContainer(node);
			docMeasure.measureVerticalContainer(node, function(err, result) {
        if (err) {
          return done(err);
        }
			  assert(result.stack[0]._minWidth);
			  assert(result.stack[0]._maxWidth);
        done();
      });
		});

		it('should calculate _minWidth and _maxWidth of all elements', function (done) {
			var node = {stack: ['this is a test', 'another one']};
			docPreprocessor.preprocessVerticalContainer(node);
			docMeasure.measureVerticalContainer(node, function(err, result) {
        if (err) {
          return done(err);
        }
			  assert.equal(result.stack[0]._minWidth, 4 * 12);
	  		assert.equal(result.stack[0]._maxWidth, 14 * 12);
	  		assert.equal(result.stack[1]._minWidth, 7 * 12);
	  		assert.equal(result.stack[1]._maxWidth, 11 * 12);
        done();
      });
		});

		it('should set _minWidth and _maxWidth to the max of inner min/max widths', function (done) {
			var node = {stack: ['this is a test', 'another one']};
			docPreprocessor.preprocessVerticalContainer(node);
			docMeasure.measureVerticalContainer(node, function(err, result) {
        if (err) {
          return done(err);
        }
			  assert.equal(node._minWidth, 7 * 12);
	  		assert.equal(node._maxWidth, 14 * 12);
        done();
      });
		});
	});

	describe('measureUnorderedList', function () {
		it('should extend document-definition-object if text items are used', function (done) {
			var node = {ul: ['asdasd', 'bbbb']};
			docPreprocessor.preprocessList(node);
			docMeasure.measureUnorderedList(node, function(err, result) {
        if (err) {
          return done(err);
        }
			  assert(result.ul[0]._minWidth);
			  assert(result.ul[0]._maxWidth);

			  assert(result._gapSize);
        done();
      });
		});
	});

	describe('measureOrderedList', function () {
		it('should extend document-definition-object if text items are used', function (done) {
			var node = {ol: ['asdasd', 'bbbb']};
			docPreprocessor.preprocessList(node);
			docMeasure.measureOrderedList(node, function(err, result) {
        if (err) {
          return done(err);
        }
			  assert(result.ol[0]._minWidth);
		  	assert(result.ol[0]._maxWidth);

		  	assert(result._gapSize);
        done();
      });
		});

		it('should calculate _minWidth and _maxWidth of all elements', function (done) {
			var node = {ol: ['this is a test', 'another one']};
			docPreprocessor.preprocessList(node);
			docMeasure.measureOrderedList(node, function(err, result) {
        if (err) {
          return done(err);
        }
        assert.equal(result.ol[0]._minWidth, 4 * 12);
        assert.equal(result.ol[0]._maxWidth, 14 * 12);
        assert.equal(result.ol[1]._minWidth, 7 * 12);
        assert.equal(result.ol[1]._maxWidth, 11 * 12);
        done();
      });
		});

		it('should set _minWidth and _maxWidth to the max of inner min/max widths + gapSize', function (done) {
			var node = {ol: ['this is a test', 'another one']};
			docPreprocessor.preprocessList(node);
			docMeasure.measureOrderedList(node, function(err, result) {
        if (err) {
          return done(err);
        }
        assert(node, result);
        assert(node._gapSize.width > 0);
        assert.equal(node._minWidth, 7 * 12 + node._gapSize.width);
        assert.equal(node._maxWidth, 14 * 12 + node._gapSize.width);
        done();
      });
		});

	});

	describe('measureTable', function () {
		var tableNode;

		beforeEach(function () {
			tableNode = {
				table: {
					headerLines: 1,
					widths: ['*', 150, 'auto', 'auto'],
					body:
						[
							['Header 1', 'H2', 'Header\nwith\nlines', {text: 'last', fontSize: 20}],
							['Column 1', 'Column 2', 'Column 3', 'Column 4'],
							['A text in the first column', 'Text in the second one', 'Other things go here', 'or here']
						]
				},
				layout: {
					vLineWidth: function () {
						return 0;
					},
					hLineWidth: function () {
						return 0;
					},
					paddingLeft: function () {
						return 0;
					},
					paddingRight: function () {
						return 0;
					}
				}
			};
		});

		it('should extend document-definition-object', function (done) {
			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode, function(err, result) {
        if (err) {
          return done(err);
        }
        assert(result.table.body[0][0]._minWidth);
        assert(result.table.body[0][0]._maxWidth);
        assert(result.table.body[0][3]._minWidth);
        assert(result.table.body[0][3]._maxWidth);
        assert(result.table.widths[0]._maxWidth);
        assert(result.table.widths[0]._minWidth);
        assert(result.table.widths[0].width);
        done();
      });
		});

		it('should not spoil widths if measureTable has been called before', function (done) {
			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode, function(err, result) {
        if (err) {
          return done(err);
        }
			  docMeasure.measureTable(result, function(err, result) {
          if (err) {
            return done(err);
          }
          assert(result.table.widths[0]._maxWidth);
          assert(result.table.widths[0]._minWidth);
          assert(result.table.widths[0].width);
          assert.equal(result.table.widths[0].width, '*');
          done();
        });
      });
		});

		it('should calculate _minWidth and _maxWidth for all columns', function (done) {
			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode, function(err, result) {
        if (err) {
          return done(err);
        }
        result.table.widths.forEach(function (width) {
          assert(width._maxWidth);
          assert(width._minWidth);
          assert(width.width);
        });
        done();
      });
		});

		it('should set _minWidth and _maxWidth of each column to min/max width or the largest cell', function (done) {
			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode, function(err, result) {
        if (err) {
          return done(err);
        }
        assert.equal(tableNode.table.widths[0]._minWidth, 6 * 12);
        assert.equal(tableNode.table.widths[0]._maxWidth, 26 * 12);
        done();
      });
		});

		it('should support single-width-definition and extend it to an array of widths', function (done) {
			var node = {
				table: {
					headerLines: 1,
					widths: 'auto',
					body:
						[
							['Header 1', 'H2', 'Header\nwith\nlines', {text: 'last', fontSize: 20}],
							['Column 1', 'Column 2', 'Column 3', 'Column 4'],
							['A text in the first column', 'Text in the second one', 'Other things go here', 'or here']
						]
				}
			};

			docPreprocessor.preprocessTable(node);
			docMeasure.measureTable(node, function(err, result) {
        if (err) {
          return done(err);
        }
        assert(node.table.widths instanceof Array);
        assert.equal(node.table.widths.length, 4);
        node.table.widths.forEach(function (w) {
          assert.equal(w.width, 'auto');
        });
        done();
      });
		});

		it.skip('should set _minWidth and _maxWidth to the sum of column min/max widths', function (done) {
			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode, function(err, result) {
        if (err) {
          return done(err);
        }
        assert.equal(tableNode._minWidth, 150 + 6 * 12 + 4 * 12 + 6 * 12);
        assert.equal(tableNode._maxWidth, 912);
        done();
      });
		});

		it('should support column spans', function (done) {
			tableNode.table.body.push([{text: 'Column 1', colSpan: 2}, {}, 'Column 3', 'Column 4']);

			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode, function(err, result) {
        if (err) {
          return done(err);
        }
        done();
      });
		});

		it('should mark cells directly following colSpan-cell with _span property and set min/maxWidth to 0', function (done) {
			tableNode.table.body.push([{text: 'Col 1', colSpan: 3}, {}, {}, 'Col 4']);
			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode, function(err, result) {
        if (err) {
          return done(err);
        }
        var rows = tableNode.table.body.length;
        assert(tableNode.table.body[rows - 1][1]._span !== undefined);
        assert(tableNode.table.body[rows - 1][2]._span !== undefined);
        assert(tableNode.table.body[rows - 1][3]._span === undefined);
        assert.equal(tableNode.table.body[rows - 1][1]._minWidth, 0);
        assert.equal(tableNode.table.body[rows - 1][1]._maxWidth, 0);
        assert.equal(tableNode.table.body[rows - 1][2]._minWidth, 0);
        assert.equal(tableNode.table.body[rows - 1][2]._maxWidth, 0);
        done();
      });
		});

		it('spanning cells should not influence min/max column widths if their min/max widths are lower or equal', function (done) {
			tableNode.layout = emptyTableLayout;

			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode, function(err, result) {
        if (err) {
          return done(err);
        }
        var col0min = tableNode.table.widths[0]._minWidth;
        var col0max = tableNode.table.widths[0]._maxWidth;
        var col1min = tableNode.table.widths[1]._minWidth;
        var col1max = tableNode.table.widths[1]._maxWidth;

        tableNode.table.body.push([{text: 'Co1', colSpan: 2}, {}, 'Column 3', 'Column 4']);
        tableNode.table.body.push([{text: '123456789012', colSpan: 2}, {}, 'Column 3', 'Column 4']);
        docPreprocessor.preprocessTable(tableNode);
        docMeasure.measureTable(tableNode, function(err, result) {
          if (err) {
            return done(err);
          }
          assert.equal(tableNode.table.widths[0]._minWidth, col0min);
          assert.equal(tableNode.table.widths[0]._maxWidth, col0max);
          assert.equal(tableNode.table.widths[1]._minWidth, col1min);
          assert.equal(tableNode.table.widths[1]._maxWidth, col1max);
          done();
        });
      });
		});

		it('spanning cells, having min-width larger than the sum of min-widths of the columns they span over, should update column min-widths equally', function (done) {
			tableNode.layout = emptyTableLayout;

			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode, function(err, result) {
        if (err) {
          return done(err);
        }
        var col0min = tableNode.table.widths[0]._minWidth;
        var col1min = tableNode.table.widths[1]._minWidth;

        assert.equal(col0min, 6 * 12);
        assert.equal(col1min, 6 * 12);

        // make sure we know default values for

        tableNode.table.body.push([{text: 'thisislongera', colSpan: 2}, {}, 'Column 3', 'Column 4']);
        docPreprocessor.preprocessTable(tableNode);
        docMeasure.measureTable(tableNode, function(err, result) {
          if (err) {
            return done(err);
          }
          assert(tableNode.table.widths[0]._minWidth > col0min);
          assert(tableNode.table.widths[1]._minWidth > col1min);

          assert.equal(tableNode.table.widths[0]._minWidth, col1min + 1 * 12 / 2);
          assert.equal(tableNode.table.widths[1]._minWidth, col1min + 1 * 12 / 2);
          done();
        });
      });
		});

		it('spanning cells, having max-width larger than the sum of max-widths of the columns they span over, should update column max-widths equally', function (done) {
			tableNode.layout = emptyTableLayout;

			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode, function(err, result) {
        if (err) {
          return done(err);
        }
        var col0max = tableNode.table.widths[0]._maxWidth;
        var col1max = tableNode.table.widths[1]._maxWidth;

        assert.equal(col0max, 26 * 12);
        assert.equal(col1max, 22 * 12);

        tableNode.table.body.push([{text: '1234 6789 1234 6789 1234 6789 1234 6789 1234 6789', colSpan: 2}, {}, 'Column 3', 'Column 4']);
        docPreprocessor.preprocessTable(tableNode);
        docMeasure.measureTable(tableNode, function(err, result) {
          if (err) {
            return done(err);
          }
          assert.equal(tableNode.table.widths[0]._maxWidth, col0max + 1 * 12 / 2);
          assert.equal(tableNode.table.widths[1]._maxWidth, col1max + 1 * 12 / 2);
          done();
        });
      });
		});

		it('calculating widths (when colSpan are used) should take into account cell padding and borders', function (done) {
			// 5 + 3 + 4 == 12 --- the exact width of the overflowing letter in thisislongera
			// it means we have enough space and there's no need to change column widths
			tableNode.layout = {
				vLineWidth: function () {
					return 5;
				},
				paddingLeft: function () {
					return 3;
				},
				paddingRight: function () {
					return 4;
				}
			};

			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode, function(err, result) {
        if (err) {
          return done(err);
        }
        var col0min = tableNode.table.widths[0]._minWidth;
        var col1min = tableNode.table.widths[1]._minWidth;

        assert.equal(col0min, 6 * 12);
        assert.equal(col1min, 6 * 12);

        tableNode.table.body.push([{text: 'thisislongera', colSpan: 2}, {}, 'Column 3', 'Column 4']);
        docPreprocessor.preprocessTable(tableNode);
        docMeasure.measureTable(tableNode, function(err, result) {
          if (err) {
            return done(err);
          }
          assert.equal(tableNode.table.widths[0]._minWidth, col0min);
          assert.equal(tableNode.table.widths[1]._minWidth, col1min);
          done();
        });
      });
		});

		it('should mark cells directly below rowSpan-cell with _span property and set min/maxWidth to 0', function (done) {
			tableNode.table.body.push([{text: 'Col 1', rowSpan: 3}, 'Col2', 'Col 3', 'Col 4']);
			tableNode.table.body.push([{}, 'Col2', 'Col 3', 'Col 4']);
			tableNode.table.body.push([{}, 'Col2', 'Col 3', 'Col 4']);
			tableNode.table.body.push(['Another', 'Col2', 'Col 3', 'Col 4']);
			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode, function(err, result) {
        if (err) {
          return done(err);
        }
        var rows = tableNode.table.body.length;
        assert(tableNode.table.body[rows - 3][0]._span !== undefined);
        assert(tableNode.table.body[rows - 2][0]._span !== undefined);
        assert(tableNode.table.body[rows - 1][0]._span === undefined);

        assert.equal(tableNode.table.body[rows - 3][0]._minWidth, 0);
        assert.equal(tableNode.table.body[rows - 3][0]._maxWidth, 0);
        assert.equal(tableNode.table.body[rows - 2][0]._minWidth, 0);
        assert.equal(tableNode.table.body[rows - 2][0]._maxWidth, 0);
        assert(tableNode.table.body[rows - 1][0]._minWidth !== 0);
        assert(tableNode.table.body[rows - 1][0]._maxWidth !== 0);
        done();
      });
		});

	describe('measureImage', function () {
		it('should scale height proportionally if only image width is provided');
		it('should stretch image if both width and height are specified');
		it('should scales image to fit whole picture in a rectangle if fit is specified');
		it('should copy alignment from styleStack into image definition object');
		it('should support dataUri images', function () {

		});
	});

	describe('measureDocument', function () {
		it('should treat margin in styling properties with higher priority', function (done) {
			docMeasure = new DocMeasure(sampleTestProvider, {'marginStyle': {margin: 10}}, {});
			var node = {text: 'test', style: 'marginStyle', margin: [5, 5, 5, 5]};
			docPreprocessor.preprocessDocument(node);
			docMeasure.measureDocument(node, function(err, result) {
        if (err) {
          return done(err);
        }
			  assert.deepEqual(result._margin, [5, 5, 5, 5]);
        done();
      });
		});

		it('should apply margins defined in the styles', function (done) {
			docMeasure = new DocMeasure(sampleTestProvider, {'topLevel': {margin: [123, 3, 5, 6]}}, {});
			var node = {text: 'test', style: 'topLevel'};
			docPreprocessor.preprocessDocument(node);
			docMeasure.measureDocument(node, function(err, result) {
        if (err) {
          return done(err);
        }
        assert.deepEqual(result._margin, [123, 3, 5, 6]);
        done();
      });
		});

		it('should apply sublevel styles not to parent', function (done) {
			docMeasure = new DocMeasure(sampleTestProvider, {'topLevel': {margin: [123, 3, 5, 6]}, 'subLevel': {margin: 5}}, {});
			var node = {ul: ['one', 'two', {text: 'three', style: 'subLevel'}], style: 'topLevel'};
			docPreprocessor.preprocessDocument(node);
			docMeasure.measureDocument(node, function(err, result) {
        if (err) {
          return done(err);
        }
        assert.deepEqual(result._margin, [123, 3, 5, 6]);
        assert.equal(result.ul[0]._margin, null);
        assert.equal(result.ul[1]._margin, null);
        assert.deepEqual(result.ul[2]._margin, [5, 5, 5, 5]);
        done();
      });
		});

		it('should apply subsublevel styles not to parent', function (done) {
			docMeasure = new DocMeasure(sampleTestProvider, {'topLevel': {margin: [123, 3, 5, 6]}, 'subLevel': {margin: 5}, 'subsubLevel': {margin: 25}}, {});
			var node = {ul: ['one', 'two', {text: 'three', style: 'subLevel'}, {ol: [{text: 'three A', style: 'subsubLevel'}]}], style: 'topLevel'};
			docPreprocessor.preprocessDocument(node);
			docMeasure.measureDocument(node, function(err, result) {
        if (err) {
          return done(err);
        }
        assert.deepEqual(result._margin, [123, 3, 5, 6]);
        assert.equal(result.ul[0]._margin, null);
        assert.equal(result.ul[1]._margin, null);
        assert.deepEqual(result.ul[2]._margin, [5, 5, 5, 5]);
        assert.deepEqual(result.ul[3].ol[0]._margin, [25, 25, 25, 25]);
        done();
      });
		});

		it('should process marginLeft property if defined', function (done) {
			var node = {text: 'some text', marginLeft: 5};
			docPreprocessor.preprocessDocument(node);
			docMeasure.measureDocument(node, function(err, result) {
        if (err) {
          return done(err);
        }
			  assert.deepEqual(result._margin, [5, 0, 0, 0]);
        done();
      });
		});

		it('should process marginRight property if defined', function (done) {
			var node = {text: 'some text', marginRight: 5};
			docPreprocessor.preprocessDocument(node);
			docMeasure.measureDocument(node, function(err, result) {
        if (err) {
          return done(err);
        }
			  assert.deepEqual(result._margin, [0, 0, 5, 0]);
        done();
      });
		});

		it('should process multiple single margin properties if defined', function (done) {
			var node = {text: 'some text', marginRight: 5, marginTop: 10, marginBottom: 2};
			docPreprocessor.preprocessDocument(node);
			docMeasure.measureDocument(node, function(err, result) {
        if (err) {
          return done(err);
        }
        assert.deepEqual(result._margin, [0, 10, 5, 2]);
        done();
      });
		});

		it('should treat margin property with higher priority than single margin properties', function (done) {
			var node = {text: 'some text', marginRight: 5, marginTop: 10, marginBottom: 2, margin: 12};
			docPreprocessor.preprocessDocument(node);
			docMeasure.measureDocument(node, function(err, result) {
        if (err) {
          return done(err);
        }
			  assert.deepEqual(result._margin, [12, 12, 12, 12]);
        done();
      });
		});

		it('should combine all single margins defined in style dict ', function (done) {
			docMeasure = new DocMeasure(sampleTestProvider, {'style1': {marginLeft: 5}, 'style2': {marginTop: 10}}, {});
			var node = {text: 'some text', style: ['style1', 'style2']};
			docPreprocessor.preprocessDocument(node);
			docMeasure.measureDocument(node, function(err, result) {
        if (err) {
          return done(err);
        }
			  assert.deepEqual(result._margin, [5, 10, 0, 0]);
        done();
      });
		});

		it('should combine the single margin defined in style dict and the object itself', function (done) {
			docMeasure = new DocMeasure(sampleTestProvider, {'style1': {marginLeft: 5}}, {});
			var node = {text: 'some text', style: ['style1'], marginRight: 15};
			docPreprocessor.preprocessDocument(node);
			docMeasure.measureDocument(node, function(err, result) {
        if (err) {
          return done(err);
        }
			  assert.deepEqual(result._margin, [5, 0, 15, 0]);
        done();
      });
		});

		it('should override only left margin if marginLeft is defined', function (done) {
			docMeasure = new DocMeasure(sampleTestProvider, {'topLevel': {margin: [123, 3, 5, 6]}, 'subLevel': {marginLeft: 5}}, {});
			var node = {ul: ['one', 'two', {text: 'three', style: 'subLevel'}], style: 'topLevel'};
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node, function(err, result) {
        if (err) {
          return done(err);
        }
        assert.deepEqual(result._margin, [123, 3, 5, 6]);
        assert.deepEqual(result.ul[2]._margin, [5, 0, 0, 0]);
        done();
      });
		});

    });
  });
});
