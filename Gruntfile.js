module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    //Not updated with WebGC version 0.4.1
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
    //Not updated with WebGC version 0.4.1
    linter: {
      options: {
        log: './logs/<%= pkg.name %>.log'
      },
      files: [ 'lib/**/*.js' ]
    },
    shell: {
      cmdObjs: {
        options: {stdout: true, stderr: true },
        command: [
          'rm -fr doc/*',
          './bower_components/jsdoc3/jsdoc -r --verbose -d ./doc ./src'
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
