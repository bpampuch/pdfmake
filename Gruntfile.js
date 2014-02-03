module.exports = function(grunt) {

	grunt.initConfig({
		mochaTest: {
			test: {
				options: {
					reporter: 'spec'
				},
				src: ['tests/**/*.js']
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

	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-jsdoc');
	grunt.loadNpmTasks('grunt-contrib-jshint');

	grunt.registerTask('default', [ 'jshint', 'mochaTest' ]);

};  