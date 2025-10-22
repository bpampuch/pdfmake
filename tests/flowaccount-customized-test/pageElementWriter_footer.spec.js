'use strict';

var assert = require('assert');
var sinon = require('sinon');

var DocumentContext = require('../../src/documentContext');

var PAGE_ELEMENT_WRITER_PATH = require.resolve('../../src/pageElementWriter');

var PAGE_SIZE = { width: 400, height: 600, orientation: 'portrait' };
var PAGE_MARGINS = { left: 20, right: 20, top: 20, bottom: 20 };

function freshWriter(options) {
	delete require.cache[PAGE_ELEMENT_WRITER_PATH];
	var PageElementWriter = require('../../src/pageElementWriter');

	var footerGapOption = options && options.footerGapOption ? options.footerGapOption : {};
	var ctx = new DocumentContext(PAGE_SIZE, PAGE_MARGINS, footerGapOption);

	if (options && options.footerColumnGuides) {
		ctx._footerColumnGuides = options.footerColumnGuides;
	}

	var tracker = { emit: sinon.spy() };
	return {
		pew: new PageElementWriter(ctx, tracker),
		ctx: ctx,
		tracker: tracker
	};
}

function buildFragment(height) {
	return {
		height: height || 10,
		items: []
	};
}

describe('FlowAccount PageElementWriter footer handling', function () {
	it('fills footer fragments with gap option and cloned guide spec from context', function () {
		var guides = {
			widths: [0, 120, 240],
			stops: [60, 180],
			style: { lineWidth: 1, color: '#333333', dash: { length: 4, space: 2 } },
			includeOuter: false
		};
		var option = {
			enabled: true,
			columns: {
				content: { vLines: [0, 120, 240] },
				style: { alignment: 'center' },
				includeOuter: true
			}
		};
		var setup = freshWriter({ footerGapOption: option, footerColumnGuides: guides });
		var fragment = buildFragment(30);

		var added = setup.pew.addFragment(fragment, undefined, undefined, undefined, 1);

		assert.strictEqual(added, true, 'footer fragment accepted on first page');
		assert.strictEqual(fragment._footerGapOption, setup.ctx._footerGapOption, 'footer gap option attached from context');
		assert.deepStrictEqual(fragment._footerGapOption.columns.content.vLines, [0, 120, 240], 'gap option retains original vLines');
		assert.ok(fragment._footerGuideSpec, 'footer guide spec attached');
		assert.notStrictEqual(fragment._footerGuideSpec, guides, 'guide spec stored as copy');
		assert.deepStrictEqual(fragment._footerGuideSpec.widths, guides.widths, 'guide widths cloned');
		assert.notStrictEqual(fragment._footerGuideSpec.widths, guides.widths, 'guide widths stored in new array');
		assert.deepStrictEqual(fragment._footerGuideSpec.stops, guides.stops, 'guide stops cloned');
		assert.notStrictEqual(fragment._footerGuideSpec.stops, guides.stops, 'guide stops stored in new array');
		assert.deepStrictEqual(fragment._footerGuideSpec.style, guides.style, 'guide style copied');
		assert.notStrictEqual(fragment._footerGuideSpec.style, guides.style, 'guide style stored in new object');
		assert.strictEqual(fragment._footerGuideSpec.includeOuter, guides.includeOuter, 'guide includeOuter preserved');
	});

	it('retries footer rendering on a fresh page when first attempt fails', function () {
		var setup = freshWriter();
		var fragment = buildFragment(40);

		var addStub = sinon.stub(setup.pew.writer, 'addFragment');
		addStub.onCall(0).returns(false);
		addStub.onCall(1).returns(true);
		var moveSpy = sinon.spy(setup.pew, 'moveToNextPage');

		var added = setup.pew.addFragment(fragment, undefined, undefined, undefined, 2);

		assert.strictEqual(added, undefined, 'call returns undefined after retry logic');
		assert.strictEqual(addStub.callCount, 2, 'writer.addFragment invoked twice');
		assert.strictEqual(addStub.firstCall.args[0], fragment, 'first call uses original fragment');
		assert.strictEqual(addStub.secondCall.args[0], fragment, 'second call retries same fragment');
		assert.strictEqual(moveSpy.callCount, 1, 'moveToNextPage triggered once');
		assert.strictEqual(addStub.secondCall.returnValue, true, 'second attempt succeeds at writer level');

		addStub.restore();
		moveSpy.restore();
	});

	it('avoids retrying footer rendering once a footer already consumed the page', function () {
		var setup = freshWriter();
		var firstFragment = buildFragment(20);
		var secondFragment = buildFragment(40);

		var addStub = sinon.stub(setup.pew.writer, 'addFragment');
		addStub.onCall(0).returns(true);
		addStub.onCall(1).returns(false);
		var moveSpy = sinon.spy(setup.pew, 'moveToNextPage');

		var firstAdded = setup.pew.addFragment(firstFragment, undefined, undefined, undefined, 1);
		var secondAdded = setup.pew.addFragment(secondFragment, undefined, undefined, undefined, 2);

		assert.strictEqual(firstAdded, true, 'initial footer rendered successfully');
		assert.strictEqual(secondAdded, undefined, 'second footer fails without retry');
		assert.strictEqual(addStub.callCount, 2, 'writer.addFragment invoked only for direct calls');
		assert.strictEqual(moveSpy.callCount, 0, 'no page advance attempted after prior footer');

		addStub.restore();
		moveSpy.restore();
	});
});
