#!/bin/bash
#===============================================================================
#
#          FILE:  makeBundle.sh
# 
#         USAGE:  ./makeBundle.sh 
# 
#   DESCRIPTION:  Creates a bundle with browserify
# 
#       OPTIONS:  ---
#  REQUIREMENTS:  ---
#          BUGS:  ---
#         NOTES:  ---
#        AUTHOR:  Raziel Carvajal-Gomez (), raziel.carvajal-gomez@inria.fr
#       COMPANY:  INRIA, Rennes
#       VERSION:  1.0
#       CREATED:  04/09/2015 11:47:30 CEST
#      REVISION:  ---
#===============================================================================

rm -f webgc.js
browserify --insert-globals -i webworker-threads -i xhr2 -r '../../src/algorithms/Cyclon.js' -r '../../src/algorithms/Vicinity.js' -r '../../src/utils/GossipUtil.js' -r '../../src/superObjs/GossipProtocol.js' -r '../../src/superObjs/ViewSelector.js' -r '../../src/controllers/GossipMediator.js' -r '../../src/utils/Profile.js' main.js -o webgc.js
