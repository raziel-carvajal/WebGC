#!/bin/bash
#===============================================================================
#
#          FILE:  launchDemo.sh
# 
#         USAGE:  ./launchDemo.sh 
# 
#   DESCRIPTION:  
# 
#       OPTIONS:  ---
#  REQUIREMENTS:  ---
#          BUGS:  ---
#         NOTES:  ---
#        AUTHOR:  Raziel Carvajal-Gomez (), raziel.carvajal-gomez@inria.fr
#       COMPANY:  INRIA, Rennes
#       VERSION:  1.0
#       CREATED:  18/02/2015 16:35:49 CET
#      REVISION:  ---
#===============================================================================


#===  FUNCTION  ================================================================
#          NAME:  isChromeInstalled
#   DESCRIPTION:  Verifies if the Chrome browser is available
#    PARAMETERS:  
#       RETURNS:  
#===============================================================================
function isChromeInstalled ()
{
if [ `uname` = "Linux" ] ; then
  if [ -a /usr/bin/google-chrome ] ; then
    chromeCommand="google-chrome"
  else
    echo "Chrome must be installed or wasn't found it"
    exit 0
  fi
else
  if [ -a /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome ]  ; then
    chromeCommand="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  else
    echo "Chrome must be installed or wasn't found it"
    exit 0
  fi
fi
chromeStr="--no-default-browser-check --no-first-run --disable-default-apps --disable-popup-blocking --enable-logging --log-level=0 --allow-file-access-from-files --user-data-dir="
}    # ----------  end of function isChromeInstalled  ----------
isChromeInstalled
peers=$1
exeTime=$2
serverDir=$3
testDir="output"
origin=`pwd`
simLim=4

rm -fr $testDir peer_*
mkdir $testDir
cd $serverDir
cd src
echo "Launching LoggingServer..."
node LoggingServer.js 9991 >log &
logServerPid=$!
cd ../examples/middleware2014
echo "Launching PeerServer..."
node server.js 9990 4 >/dev/null &
nodePid=$!

echo "Launching instances of Chrome (one of them represents one peer)..."
declare -a chromePids
cd $origin
for (( COUNTER=0; COUNTER<$peers; COUNTER++ )); do
  peerDir="peer_$COUNTER"
  mkdir $testDir/$peerDir
  data=$(( $COUNTER % $simLim ))
  htmlFile=$peerDir".html"
  cat "tmp.html" | sed "s/#userProfile/$data/;s/#userId/$peerDir/;" >$htmlFile
  "$chromeCommand" $chromeStr$testDir/$peerDir $htmlFile >/dev/null &
  chromePids[$COUNTER]=$!
done
echo -e "\tDONE"
echo "Waiting till the time of the experiment expires..."
timeout=$(( $exeTime * 60 ))
sleep $timeout
echo -e "\tKilling node instances..."
kill -9 $logServerPid $nodePid
echo -e "\tDONE"
echo "killing chrome instances..."
for (( COUNTER=0; COUNTER<$peers; COUNTER++ )); do
  kill -9 ${chromePids[$COUNTER]}
done
echo -e "\tDONE"
rm -fr $testDir peer_*
echo "END OF THE EXECUTION"
echo "the file: src/log at $serverDir contains the log of each peer"
