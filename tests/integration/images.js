/* jslint node: true */
'use strict';

var assert = require('assert');
var _ = require('lodash');

var integrationTestHelper = require('./integrationTestHelper');

describe('Integration Test: images', function () {

	var testHelper = new integrationTestHelper();

	var INLINE_TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAQMAAADNIO3CAAAAA1BMVEUAAN7GEcIJAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB98DBREbA3IZ3d8AAAALSURBVAjXY2BABwAAEgAB74lUpAAAAABJRU5ErkJggg==';

	describe('basics', function () {
		it('renders next element below image', function (done) {
			var imageHeight = 150;
			var dd = {
				content: [
					{
						image: INLINE_TEST_IMAGE,
						height: imageHeight
					},
					'some Text'
				]
			};

			testHelper.renderPages('A6', dd, function(err, pages) {
        if (err) {
          return done(err);
        }
        assert.equal(pages.length, 1);

        var image = pages[0].items[0].item;
        var someElementAfterImage = pages[0].items[1].item;

        assert.equal(image.x, testHelper.MARGINS.left);
        assert.equal(image.y, testHelper.MARGINS.top);
        assert.equal(someElementAfterImage.x, testHelper.MARGINS.left);
        assert.equal(someElementAfterImage.y, testHelper.MARGINS.top + imageHeight);
        done();
      });
		});

		it('renders image below text', function (done) {
			var imageHeight = 150;
			var dd = {
				content: [
					'some Text',
					{
						image: INLINE_TEST_IMAGE,
						height: imageHeight
					}
				]
			};

			testHelper.renderPages('A6', dd, function(err, pages) {
        if (err) {
          return done(err);
        }
        assert.equal(pages.length, 1);

        var someElementAfterImage = pages[0].items[0].item;
        var image = pages[0].items[1].item;


        assert.equal(someElementAfterImage.x, testHelper.MARGINS.left);
        assert.equal(someElementAfterImage.y, testHelper.MARGINS.top);

        assert.equal(image.x, testHelper.MARGINS.left);
        assert.equal(image.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT);
        done();
      });
		});
	});

});
