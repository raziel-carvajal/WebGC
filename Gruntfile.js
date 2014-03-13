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
          'lib/launchers/rps-launcher.js',
          'lib/launchers/clustering-launcher.js'
        ],
        dest: 'dist/<%= pkg.name %>.min.js'
      }
    },
    linter: {
      options: {
        log: './logs/<%= pkg.name %>.log'
      },
      files: [
        'lib/launchers/*.js',
        'lib/gossip-based-algos/*.js',
        'lib/utils/*.js',
        'lib/executors/*.js'
      ]
    }
//    copy: {
//      main: {
//        files: [
//	        {expand: true, cwd: 'lib', src: '*', dest: 'dist/'}
//	      ]
//      }
//    },
//    karma: {
//      unit: {
//        configFile: 'karma.conf.js'
//      }
//    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-linter');
//  grunt.loadNpmTasks('grunt-karma');

  // Default task(s).
  grunt.registerTask('default', ['uglify', 'linter']);
//  grunt.registerTask('default', ['uglify', 'copy']);
//  grunt.registerTask('test', ['karma']);
};
