'use strict';

var assert = require('assert');
var VirtualFileSystem = require('../../js/virtual-fs').VirtualFileSystem;

describe('VirtualFileSystem', function () {
	describe('unlinkSync', function () {
		it('should delete the requested file and preserve other files', function () {
			var fs = new VirtualFileSystem();
			fs.writeFileSync('file', 'content');
			fs.writeFileSync('other', 'other content');

			assert.strictEqual(fs.unlinkSync('file'), undefined);
			assert.strictEqual(fs.existsSync('file'), false);
			assert.throws(() => fs.readFileSync('file'), /not found/);
			assert.strictEqual(fs.readFileSync('other', 'utf8'), 'other content');
		});

		it('should normalize filenames before deleting', function () {
			var fs = new VirtualFileSystem();
			fs.writeFileSync('file', 'content');

			fs.unlinkSync('/file');

			assert.strictEqual(fs.existsSync('file'), false);
		});

		it('should throw when the file does not exist', function () {
			var fs = new VirtualFileSystem();

			assert.throws(() => fs.unlinkSync('/missing'), {
				message: "File 'missing' not found in virtual file system"
			});
		});

		it('should delete local files without deleting shared files', function () {
			var parent = new VirtualFileSystem();
			var fs = new VirtualFileSystem(parent);
			parent.writeFileSync('file', 'shared');
			fs.writeFileSync('file', 'local');

			fs.unlinkSync('file');

			assert.deepStrictEqual(fs.storage, {});
			assert.strictEqual(parent.readFileSync('file', 'utf8'), 'shared');
			assert.strictEqual(fs.readFileSync('file', 'utf8'), 'shared');
			assert.throws(() => fs.unlinkSync('file'), /not found/);
		});
	});
});
