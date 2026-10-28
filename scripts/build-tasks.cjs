// Fixed build operations using Node APIs, without a shell/glob/watch dependency tree.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function destination(relative) {
	const target = path.resolve(root, relative);
	if (!target.startsWith(root + path.sep)) throw new Error('Build target must remain inside the repository');
	return target;
}
switch (process.argv[2]) {
	case 'clean':
		for (const name of ['js', 'build']) fs.rmSync(destination(name), { recursive: true, force: true });
		break;
	case 'node': {
		const babel = require('@babel/core');
		let count = 0;
		function compile(relative) {
			for (const entry of fs.readdirSync(path.join(root, 'src', relative), { withFileTypes: true })) {
				const file = path.join(relative, entry.name);
				if (entry.isDirectory()) compile(file);
				else if (file.endsWith('.js')) {
					const target = destination(path.join('js', file));
					fs.mkdirSync(path.dirname(target), { recursive: true });
					const result = babel.transformFileSync(path.join(root, 'src', file), { cwd: root });
					fs.writeFileSync(target, result.code + '\n');
					count++;
				}
			}
		}
		compile('');
		console.log(`Compiled ${count} JavaScript files using the existing Babel configuration`);
		break;
	}
	case 'fonts': {
		const target = destination('build/fonts/Roboto');
		fs.mkdirSync(target, { recursive: true });
		for (const entry of fs.readdirSync(path.join(root, 'fonts/Roboto'), { withFileTypes: true })) {
			if (entry.isFile()) fs.copyFileSync(path.join(root, 'fonts/Roboto', entry.name), path.join(target, entry.name));
		}
		const output = execFileSync(process.execPath, [require.resolve('brfs/bin/cmd.js'), './src/browser-extensions/fonts/Roboto.js'], { cwd: root, maxBuffer: 16 * 1024 * 1024 });
		fs.writeFileSync(destination('build/fonts/Roboto.js'), output);
		break;
	}
	case 'third-party':
		for (const name of ['source.js', 'LICENSE']) fs.copyFileSync(path.join(root, 'node_modules/svg-to-pdfkit', name), destination('src/3rd-party/svg-to-pdfkit/' + name));
		execFileSync('git', ['apply', 'src/3rd-party/svg-to-pdfkit/0001-fix-contains.patch'], { cwd: root, stdio: 'inherit' });
		break;
	default:
		throw new Error('Expected one of: clean, node, fonts, third-party');
}
