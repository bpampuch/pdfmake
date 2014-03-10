module.exports = function(grunt) {
	grunt.initConfig({
		replace: {
			// expose a couple of methods so they can be unit-tested
			exposeTestMethods: {
				src: ['src/*.js'],
				overwrite: true,
				replacements: [{
					from: /^(\/(\*)*TESTS.*$)/gm,
					to: '/$1'
				}]
			},
			// hide private methods
			hideTestMethods: {
				src: ['src/*.js'],
				overwrite: true,
				replacements: [{
					from: /^(\/(\/(\*)*TESTS.*$))/gm,
					to: '$2'
				}]
			},
			// updates pdfkit for client-side-support
			fixPdfKit: {
				src: ['node_modules/pdfkit/js/document.js', 'node_modules/pdfkit/js/mixins/fonts.js', 'node_modules/pdfkit/js/font/table.js'],
				overwrite: true,
				replacements: [{
					from: /^(\s*mixin = function\()(name)(\) {.*)$/mg,
					to: '$1$2, methods$3'
				}, {
					from: /^(.*require.*\.\/mixins\/'.*$)/mg,
					to: '//'
				}, {
					from: /^(\s*mixin\('([a-zA-Z]*)')(\);)/mg,
					to: '$1, require(\'./mixins/$2.js\')$3'
				}, {
					from: 'return this.font(\'Helvetica\');',
					to: ''
				},
				/* IE workaround for no constructor.name */
					{
					from: 'this.constructor.name.replace',
					to: '(this.constructor.name || this.constructor.toString().match(/function (.{1,})\\(/)[1]).replace'
				}]
			}
		},

		mochacov: {
			test: {
				options: {
					reporter: '<%= (grunt.option("cc") ? "html-cov" : "spec") %>',
				},
				src: ['tests/**/*.js'],
			}
		},

		jsdoc: {
			dist: {
				src: ['src/*.js'],
				options: {
					destination: 'doc',
					a: 'true'
				}
			}
		},

		jshint: {
			all: [ 'src/**/*.js' ]
		},

		browserify: {
			build: {
				options: {
					standalone: 'pdfMake',
					alias: './src/browser-extensions/virtual-fs.js:fs'
				},
				files: {
					'build/pdfmake.js': ['src/printer.js']
				}
			}
		},

		dump_dir: {
			fonts: {
				options: {
					pre: 'var vfs_fonts = ',
					rootPath: 'examples/fonts/'
				},
				files: {
					'build/vfs_fonts.js': ['examples/fonts/*' ]
				}
			}
		},

		uglify: {
			build: {
				options: {
					sourceMap: true,
					compress: {
						drop_console: true
					}
				},
				files: {
					'build/pdfmake.min.js': ['build/pdfmake.js']
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-mocha-cov');
	grunt.loadNpmTasks('grunt-jsdoc');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-text-replace');
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-dump-dir');

	grunt.registerTask('test', [ 'replace:exposeTestMethods', 'jshint', 'mochacov', 'replace:hideTestMethods' ]);

	grunt.registerTask('buildFonts', [ 'dump_dir' ]);
	grunt.registerTask('build', [ 'replace:fixPdfKit', 'browserify', 'uglify', 'buildFonts' ]);

	grunt.registerTask('default', [ 'test', 'build' ]);
};
