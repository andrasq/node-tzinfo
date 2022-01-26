module.exports = function (grunt) {
	grunt.loadNpmTasks('grunt-run');
	grunt.initConfig({
		run: {
			options: {},
			npm_test: {
				exec: 'npm run test --silent'
			},
			npm_build: {
				exec: 'npm run build'
			},
			npm_coverage: {
				exec: 'npm run coverage'
			}
		}
	});
	grunt.registerTask('default', [ 'run:npm_test' ]);
	grunt.registerTask('build', [ 'run:npm_build' ]);
	grunt.registerTask('coverage', [ 'run:npm_coverage' ]);
};
