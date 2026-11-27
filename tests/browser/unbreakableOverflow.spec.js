var assert = require('assert');
var pdfmake = require('../../build/pdfmake.js');
pdfmake.addVirtualFileSystem(require('../../build/vfs_fonts.js'));

describe('Browser unbreakable overflow policy', function () {
	it('rejects strict overflow and preserves the default fallback', async function () {
		function definition() {
			return { pageSize: 'A6', content: [{ unbreakable: true, text: Array.from({ length: 60 }, (_, i) => 'L' + i).join('\n') }] };
		}
		await assert.rejects(pdfmake.createPdf(definition(), { unbreakableOverflow: 'error' }).getBuffer(), { code: 'UNBREAKABLE_BLOCK_OVERFLOW' });
		assert.ok((await pdfmake.createPdf(definition()).getBuffer()).length > 0);
	});
});
