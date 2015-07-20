#!/bin/bash
#===============================================================================
#
#          FILE:  launchTest.sh
# 
#         USAGE:  ./launchTest.sh 
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
#       CREATED:  20/07/2015 10:58:26 CEST
#      REVISION:  ---
#===============================================================================
#===  FUNCTION  ================================================================
#          NAME:  generateProfile
#   DESCRIPTION:  
#    PARAMETERS:  
#       RETURNS:  
#===============================================================================
peers=$1
exeTime=$2
profilesNum=$3
serverDir=$4
origin=`pwd`
rm -fr ./logs
mkdir logs
cd $serverDir
cd examples
rm -f signlaing.log
echo "Launching signaling service"
DEBUG=* node launch.js 9990 &>signlaing.log &
sleep 5
sigServPid=$!
echo -e "\tDONE. Signaling service at process: "$sigServPid
cd $origin
declare -a peerPids
echo "Launching peers"
for (( COUNTER=0; COUNTER<$peers; COUNTER++ )); do
  DEBUG=* node launchCoordi.js peer_$COUNTER $profilesNum &>logs/peer_$COUNTER".log" &
  peerPids[$COUNTER]=$!
  echo -e "\tPeer wit PID: "${peerPids[$COUNTER]}" was launched"
  sleep 3
done
echo "Waiting until the end of the experiment"
timeout=$(( $exeTime * 60 ))
sleep $timeout
echo -e "\tTimeout of experiment was reached"
kill -9 $sigServPid
for (( COUNTER=0; COUNTER<$peers; COUNTER++ )); do
  kill -9 ${peerPids[$COUNTER]}
done
echo -e "\tDONE. All processes were killed"
# rm -fr ./logs
cd $serverDir
cd examples
# rm -f signlaing.log
cd $origin
echo "END OF EXECUTION"
