var gulp = require('gulp');
var webpack = require('webpack-stream');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var sourcemaps = require('gulp-sourcemaps');
var replace = require('gulp-replace');
var mocha = require('gulp-spawn-mocha');
var eslint = require('gulp-eslint');
var each = require('gulp-each');
var fc2json = require('gulp-file-contents-to-json');
var header = require('gulp-header');
var log = require('fancy-log');
var PluginError = require('plugin-error');
var DEBUG = process.env.NODE_ENV === 'debug',
	CI = process.env.CI === 'true';

var banner = '/*! <%= pkg.name %> v<%= pkg.version %>, @license <%= pkg.license %>, @link <%= pkg.homepage %> */\n';

var uglifyOptions = {
	compress: {
		drop_console: true
	},
	mangle: {
		reserved: ['HeadTable', 'NameTable', 'CmapTable', 'HheaTable', 'MaxpTable', 'HmtxTable', 'PostTable', 'OS2Table', 'LocaTable', 'GlyfTable']
	}
};

gulp.task('build', function () {
	var pkg = require('./package.json');
	return gulp.src('src/browser-extensions/pdfMake.js')
		.pipe(webpack(require('./webpack.config.js'), null, reportWebPackErrors))
		.pipe(replace(/\/[*/][@#]\s+sourceMappingURL=((?:(?!\s+\*\/).)*).*\n/g, ''))
		.pipe(header(banner, {pkg: pkg}))
		.pipe(gulp.dest('build'))
		.pipe(sourcemaps.init())
		.pipe(uglify(uglifyOptions))
		.pipe(header(banner, {pkg: pkg}))
		.pipe(rename({extname: '.min.js'}))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('build'));
});

function reportWebPackErrors(err, stats) {
	if (err) {
		throw new PluginError("webpack", err);
	}
	log("[webpack]", stats.toString({}));
}

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
			var newContent = 'this.pdfMake = this.pdfMake || {}; this.pdfMake.vfs = ' + content + ';';
			callback(null, newContent);
		}, 'buffer'))
		.pipe(gulp.dest('build'));
});

gulp.task('watch', function () {
	gulp.watch('./src/**', ['test', 'build']);
	gulp.watch('./tests/**', ['test']);
});

gulp.task('default', gulp.series(/*'lint',*/ 'test', 'build', 'buildFonts'));
