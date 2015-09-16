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
#          NAME:  generateProfile
#   DESCRIPTION:  
#    PARAMETERS:  
#       RETURNS:  
#===============================================================================
function generateProfile ()
{
  doubleProf=""
  for (( COUNTER2=1; COUNTER2<=$profilesNum; COUNTER2++ )); do
    doubleProf=$doubleProf"vicinity"$COUNTER2": ["
    lines=`cat preferences$COUNTER2 | wc -l`
    for (( COUNTER3=1; COUNTER3<$lines; COUNTER3++ )); do
      pref=`head -$COUNTER3 preferences$COUNTER2 | tail -1`
      if [ $(( $RANDOM%2 )) = 1 ] ; then
        doubleProf=$doubleProf$pref", "
      else
        doubleProf=$doubleProf"'undefined', "
      fi
    done
    pref=`head -$lines preferences$COUNTER2 | tail -1`
    if [ $(( $RANDOM%2 )) = 1 ] ; then
      doubleProf=$doubleProf$pref"], "
    else
      doubleProf=$doubleProf"'undefined'], "
    fi
  done
  doubleProf="{"$doubleProf"}"
}    # ----------  end of function generateProfile  ----------
#===  FUNCTION  ================================================================
#          NAME:  
#   DESCRIPTION:  
#    PARAMETERS:  
#       RETURNS:  
#===============================================================================
function getData ()
{
modNum=$1
n=$2
data="["
for (( COUNTER1=0; COUNTER1<n-1; COUNTER1++ )); do
  data=$data$(($RANDOM%modNum))", "
done
data=$data$(($RANDOM%modNum))"]"
}    # ----------  end of function getData  ----------
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
    exit 1
  fi
else
  if [ -a /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome ]  ; then
    chromeCommand="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  else
    echo "Chrome must be installed or wasn't found it"
    exit 1
  fi
fi
chromeStr="--no-default-browser-check --no-first-run --disable-default-apps --disable-popup-blocking --enable-logging --log-level=0 --allow-file-access-from-files"
}    # ----------  end of function isChromeInstalled  ----------
peers=$1
exeTime=$2
serverDir=$3
browser=$4
#profilesNum=$5
testDir="output"
origin=`pwd`
simLim=4
if [ $browser = "firefox" ] ; then
  chromeCommand="firefox"
  chromeStr=""
else
  isChromeInstalled
fi
if [ -f "bundle.js" ] ; then
  echo "Javascript bundle exists"
else
  echo "Compile the bundle.js file with browserify"
  exit 1
fi
rm -fr $testDir peer_*
mkdir $testDir
cd $serverDir
cd examples
echo "Launching Singaling Service..."
DEBUG=* node launch.js 9990 &> signalingServer.log &
nodePid=$!
sleep 2
echo -e "\tDONE"
echo "Opening browser windows (one of them represents one peer)..."
declare -a chromePids
cd $origin
for (( COUNTER=0; COUNTER<$peers; COUNTER++ )); do
  #generateProfile
  htmlFile=peer$COUNTER".html"
  cat "index.html" | sed "s/#userProfile/\['uno','dos'\]/;s/#userId/peer$COUNTER/;" >$htmlFile
  "$chromeCommand" $chromeStr $htmlFile >/dev/null &
  chromePids[$COUNTER]=$!
  sleep 1
  echo "Browser PID: "${chromePids[$COUNTER]}
done
echo -e "\tDONE"
echo "Waiting till the time of the experiment expires..."
timeout=$(( $exeTime * 60 ))
sleep $timeout
echo -e "\tDONE"
echo -e "Stoping singnaling service"
kill -9 $nodePid
echo -e "\tDONE"
echo "closing browser windows..."
for (( COUNTER=0; COUNTER<$peers; COUNTER++ )); do
  kill -9 ${chromePids[$COUNTER]}
done
echo -e "\tDONE"
echo "END OF THE EXECUTION"
