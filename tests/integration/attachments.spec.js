'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');

describe('Integration test: attachments in unbreakable blocks', function () {
	var testHelper = new IntegrationTestHelper();

	[false, true].forEach(function (nested) {
		it('preserves the attachment and its position in ' + (nested ? 'nested blocks' : 'a block moved to the next page'), function () {
			var file = { src: Buffer.from('Attachment contents'), name: 'example.txt' };
			var attachment = { attachment: file, icon: 'Paperclip', width: 12, height: 18 };
			var block = { unbreakable: true, stack: [attachment, { text: 'Attachment label' }] };
			var content;
			if (nested) {
				block.margin = [7, 3, 0, 0];
				content = [{ unbreakable: true, margin: [10, 5, 0, 0], stack: [block] }];
			} else {
				content = Array.from({ length: 22 }, (_, index) => ({ text: 'before-' + index })).concat([block]);
			}

			var pages = testHelper.renderPages('A6', { content: content });
			var attachments = pages.flatMap((page, pageIndex) => page.items.filter(item => item.type === 'attachment').map(item => ({ page: pageIndex, item: item.item })));
			assert.equal(attachments.length, 1);
			assert.equal(attachments[0].page, nested ? 0 : 1);
			assert.equal(attachments[0].item.x, testHelper.MARGINS.left + (nested ? 17 : 0));
			assert.equal(attachments[0].item.y, testHelper.MARGINS.top + (nested ? 8 : 0));
			assert.equal(attachments[0].item._width, 12);
			assert.equal(attachments[0].item._height, 18);
			assert.equal(attachments[0].item.icon, 'Paperclip');
			assert.deepEqual(attachments[0].item.attachment, file);
		});
	});
});
