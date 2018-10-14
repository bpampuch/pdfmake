var gulp = require('gulp');
var webpack = require('webpack');
var mocha = require('gulp-spawn-mocha');
var eslint = require('gulp-eslint');
var each = require('gulp-each');
var fc2json = require('gulp-file-contents-to-json');
var babel = require("gulp-babel");
var log = require('fancy-log');
var PluginError = require('plugin-error');

var DEBUG = process.env.NODE_ENV === 'debug';
var CI = process.env.CI === 'true';

var vfsBefore = "var vfs = ";
var vfsAfter = "; if (typeof this.pdfMake !== 'undefined' && typeof this.pdfMake.addVirtualFileSystem !== 'undefined') { this.pdfMake.addVirtualFileSystem(vfs); } if (typeof module !== 'undefined') { module.exports = vfs; }";

gulp.task('buildNode', function () {
	return gulp.src('src/**/*.js')
		.pipe(babel({
			presets: [
				[
					"@babel/preset-env",
					{
						targets: {
							node: "6.10"
						},
						loose: true
					}
				]
			]
		}))
		.pipe(gulp.dest("js"));
});


gulp.task('buildBrowser', function (callback) {
	webpack(require('./webpack.config.js'), function (err, stats) {
		if (err) {
			throw new PluginError("webpack", err);
		}
		log("[webpack]", stats.toString({}));
		callback();
	});
});


gulp.task('test', function () {
	return gulp.src(['./tests/**/*.js'])
		.pipe(mocha({
			debugBrk: DEBUG,
			R: CI ? 'spec' : 'nyan'
		}));
});

gulp.task('lint', function () {
	return gulp.src(['./src/**/*.js'])
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failAfterError());
});

gulp.task('buildFonts', function () {
	return gulp.src(['./examples/fonts/*.*'])
		.pipe(each(function (content, file, callback) {
			var newContent = new Buffer(content).toString('base64');
			callback(null, newContent);
		}, 'buffer'))
		.pipe(fc2json('vfs_fonts.js', {flat: true}))
		.pipe(each(function (content, file, callback) {
			var newContent = vfsBefore + content + vfsAfter;
			callback(null, newContent);
		}, 'buffer'))
		.pipe(gulp.dest('build'));
});

gulp.task('watch', function () {
	gulp.watch('./src/**', ['test', 'build']);
	gulp.watch('./tests/**', ['test']);
});

gulp.task('build', gulp.series('buildNode'/*, 'buildBrowser'*/));

gulp.task('default', gulp.series(/*'lint',*/ 'build', /*'buildFonts',*/ 'test'));
