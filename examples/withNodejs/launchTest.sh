#!/bin/bash
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
peers=$1
exeTime=$2
profilesNum=$3
for ((COUNTER=1; COUNTER<=))
