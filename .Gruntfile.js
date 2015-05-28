module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: [ // This minize was written just for testing uglify
          'lib/utils/dumb-proximity-func.js',
          'lib/utils/gossip-util.js',
          'lib/apis/GossipProtocol.js',
          'lib/patterns/GossipFactory.js',
          'lib/algorithms/Cyclon.js',
          'lib/algorithms/Vicinity.js',
          'lib/algorithms/RandomPeerSampling.js',
          'lib/controllers/Coordinator.js'
        ],
        dest: 'dist/<%= pkg.name %>.min.js'
      }
    },
    linter: {
      options: {
        log: './logs/<%= pkg.name %>.log'
      },
      files: [ 'lib/**/*.js' ]
    },
    shell: {
      vicinityLocalTest: {
        options: { stdout: true, stderr: true },
        command: [
          'cd test/vicinity-local-test',
          './vicinity-test.sh'
        ].join('&&')
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-linter');
  grunt.loadNpmTasks('grunt-shell');

  // Default task(s).
  grunt.registerTask('default', ['uglify', 'linter', 'shell']);
};
