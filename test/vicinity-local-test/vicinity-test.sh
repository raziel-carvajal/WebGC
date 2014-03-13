#!/bin/bash
#===============================================================================
#
#          FILE:  vicinity-test.sh
# 
#         USAGE:  ./vicinity-test.sh 
#                   <peers>                 - Number of peers in the test (integer)
#                   <execution-time>        - Duration (in seconds) of the test (integer)
#                   <serverjs-gossip-dir>   - Directory that contains the fork of the 
#                                             serverjs-gossip project
#                   <test-directory>        - Directory where the test will be executed
# 
#   DESCRIPTION:  This script coordinates a local test of the Vicinity protocol amog a set
#               of peers. The representation of each peer is made using a window of the
#               the google chrome browswer. So, it is recommended to make a test with at
#               most 15 peers in order to avoid an affectation to the performance of the 
#               user's computer.
#
#  REQUIREMENTS:  * Google Chrome 31.0 or higher.
#                 * NodeJS must be installed too, besides this is indicated in the repository
#                 of serverjs-gossip
#
#          BUGS:  ---
#
#         NOTES:  * The parameter <peers> must be lower than 16
#                 * ATENTTION: During the execution some window alerts of the browser could
#                 appear, it is recommended do not performed any action on them
#                 * The user must be sure that to type the command 'google-chrome' in a 
#                 terminal lunch the Chrome browser
#                 * Any type matching is performed
#
#        AUTHOR:  Raziel Carvajal-Gomez (), raziel.carvajal-gomez@inria.fr
#       COMPANY:  INRIA, Rennes
#       VERSION:  1.0
#       CREATED:  27/02/2014 18:14:14 CET
#      REVISION:  ---
#===============================================================================

opSysStr=`uname`
if [ $opSysStr = "Linux" ] ; then
  chromeCommand="google-chrome"
else
  if [ $opSysStr = "Darwin" ] ; then
    chromeCommand="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  else
    echo -e "The operating system is not recognized\nEnd of the execution"
    exit 1
  fi
fi

peers=$1
exeTime=$2
serverDir=$3
testDir=$4
origin=`pwd`
simLim=3
chromeStr="--no-default-browser-check --no-first-run --disable-default-apps --disable-popup-blocking --enable-logging --log-level=0 --user-data-dir="

cd $testDir
testDir=`pwd`
peersDir="peers"
mkdir $peersDir
cd $peersDir
declare -a chromePids

cd $serverDir
cd serverjs-gossip/examples
node server.js 9001 4 >/dev/null &
nodePid=$!

cd $origin
for (( COUNTER=0; COUNTER<$peers; COUNTER++ )); do
  peerDir="peer_$COUNTER"
  i=$(( $COUNTER % $simLim ))
  htmFile=$i".html"
  "$chromeCommand" $chromeStr$testDir/$peersDir/$peerDir $htmFile &>/dev/null &
  chromePids[$COUNTER]=$!
done

echo "Waiting..."
sleep $exeTime
kill -9 $nodePid
echo -e "\tDONE"

cd $testDir
resultsDir="results"
mkdir $resultsDir
cd $resultsDir

for (( COUNTER=0; COUNTER<$peers; COUNTER++ )); do
  kill -9 ${chromePids[$COUNTER]}
  peerDir="peer_$COUNTER"
  mkdir $peerDir
  mv ../$peersDir/$peerDir/chrome_debug.log $peerDir
  cat $peerDir/chrome_debug.log | sed -n '/{*}/p' | sed 's/.*{\(.*\)}.*/\1/' >$peerDir/log
done

echo "END OF THE EXECUTION"
