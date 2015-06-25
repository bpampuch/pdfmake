// initial version, doesn't bundle vfs_fonts yet

var gulp = require('gulp');
var webpack = require('gulp-webpack');
var gutil = require('gulp-util');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var sourcemaps = require('gulp-sourcemaps');
var replace = require('gulp-replace');
var mocha = require('gulp-spawn-mocha');
var jshint = require('gulp-jshint');

var uglifyOptions = {
	preserveComments: 'some',
	// source_map: 'pdfmake.min.js.map',
	compress: {
		drop_console: true
	},
	mangle: {
		except: ['HeadTable', 'NameTable', 'CmapTable', 'HheaTable', 'MaxpTable', 'HmtxTable', 'PostTable', 'OS2Table', 'LocaTable', 'GlyfTable']
	}
};


gulp.task('default', [/*'lint',*/ 'test', 'build']);
gulp.task('build', function() {
	return gulp.src('src/browser-extensions/pdfMake.js')
		.pipe(webpack(require('./webpack.config.js'), null, reportWebPackErrors))
		.pipe(gulp.dest('build'))
		.pipe(sourcemaps.init())
		.pipe(uglify(uglifyOptions))
		.pipe(rename({ extname: '.min.js' }))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('build'));
});

function reportWebPackErrors(err, stats) {
  if(err) throw new gutil.PluginError("webpack", err);
  gutil.log("[webpack]", stats.toString({
  }));
}

gulp.task('test', ['prepareTestEnv'], function(cb) {
	return gulp.src(['test-env/tests/**/*.js'])
		.pipe(mocha({
			reporter: 'spec',
			'check-leaks': true
		}));
});

gulp.task('prepareTestEnv', ['copy-src-with-exposed-test-methods', 'copy-tests']);

gulp.task('copy-src-with-exposed-test-methods', function() {
	return gulp.src(['src/**/*.js'], { base: './' })
		.pipe(replace(/^(\/(\*)*TESTS.*$)/gm, '/$1'))
		.pipe(gulp.dest('test-env'));
});

gulp.task('copy-tests', function() {
	return gulp.src('tests/**/*.*', { base: './' })
		.pipe(gulp.dest('test-env'))
});

gulp.task('lint', function() {
  return gulp.src(['./src/**/*.js'])
    .pipe(jshint())
		.pipe(jshint.reporter());
});
