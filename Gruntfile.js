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
		}
	});

	grunt.loadNpmTasks('grunt-mocha-cov');
	grunt.loadNpmTasks('grunt-jsdoc');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-text-replace');

	grunt.registerTask('test', [ 'replace:exposeTestMethods', 'jshint', 'mochacov', 'replace:hideTestMethods' ]);

	grunt.registerTask('default', [ 'test' ]);
};
