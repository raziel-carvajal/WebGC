#!/bin/bash
#===============================================================================
#
#          FILE:  multi-protocols.sh
# 
#         USAGE:  ./multi-protocols.sh 
# 
#   DESCRIPTION:  Local test of the gossipjs and serverjs through the execution of 
#               multiple gossip-based protocols through the use of a configuration
#               file. 
# 
#       OPTIONS:  ---
#  REQUIREMENTS:  ---
#          BUGS:  ---
#         NOTES:  ---
#        AUTHOR:  Raziel Carvajal-Gomez (), raziel.carvajal-gomez@inria.fr
#       COMPANY:  INRIA, Rennes
#       VERSION:  1.0
#       CREATED:  24/03/2014 11:48:44 CET
#      REVISION:  ---
#===============================================================================

peers=$1
exeTime=$2
serverDir=$3
testDir="output"
origin=`pwd`
simLim=3

#chromeStr="--no-default-browser-check --no-first-run --disable-default-apps --disable-popup-blocking --enable-logging --log-level=0 --user-data-dir="
chromeStr="--no-default-browser-check --no-first-run --disable-popup-blocking --user-data-dir="

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
echo "Your operating system is: $opSysStr"
rm -fr $testDir "peer_*" "plotter"
mkdir $testDir

cd $testDir
testDir=`pwd`
peersDir="peers"
mkdir $peersDir
cd $peersDir
declare -a chromePids

cd $serverDir
cd lib
echo "Launching LoggingServer..."
node LoggingServer.js 9001 >~/tmp/log.out &
logServerPid=$!
echo -e "\tDONE"

sleep 5

cd ../examples
echo "Launching PeerServer..."
node server.js 9000 4 >~/tmp/server.out &
nodePid=$!
echo -e "\tDONE"

echo "Waiting the announcement of the plotter..."
sleep 5
echo -e "\tDONE"

cd $origin
echo "Launching plotter..."
mkdir plotter
"$chromeCommand" $chromeStr"plotter" graph.html >/dev/null &
plotterPid=$!
echo -e "\tDONE"

sleep 5

echo "Launching instances of Chrome (one of them represents one peer)..."
for (( COUNTER=0; COUNTER<$peers; COUNTER++ )); do
  peerDir="peer_$COUNTER"
  data=$(( $COUNTER % $simLim ))
  htmlFile=$peerDir".html"
  cat "multi-protocol.html" | sed -r "s/#D/$data/;s/#P/$peerDir/;" >$htmlFile
  "$chromeCommand" $chromeStr$testDir/$peersDir/$peerDir $htmlFile >/dev/null &
  chromePids[$COUNTER]=$!
done
echo -e "\tDONE"

echo "Waiting till the time of the experiment expires..."
sleep $exeTime
kill -9 $logServerPid $nodePid $plotterPid
echo -e "\tDONE"

cd $testDir
resultsDir="results"
mkdir $resultsDir
cd $resultsDir

echo "Parsing results..."
for (( COUNTER=0; COUNTER<$peers; COUNTER++ )); do
  kill -9 ${chromePids[$COUNTER]}
#  peerDir="peer_$COUNTER"
#  mkdir $peerDir
#  mv ../$peersDir/$peerDir/chrome_debug.log $peerDir
#  cat $peerDir/chrome_debug.log | sed -n '/{*}/p' | sed 's/.*{\(.*\)}.*/\1/' >$peerDir/log
done
echo -e "\tDONE"
echo "END OF THE EXECUTION"
#echo "You can find the results of the test at test/vicinity-local-test/output/results"
