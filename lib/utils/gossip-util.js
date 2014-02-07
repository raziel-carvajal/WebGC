(function(exports){ 

var gossipUtil = {
  newItem: function(timeStamp, payload){
    return {timeStamp: timeStamp, payload: payload};
  },
  // Get a sub-dictionary
  getRandomSubDict: function(n, src){
    var keys = Object.keys(src);
    if( n <= 0 || keys.length === 0 )
      return {};
    var result = {}, tmp = {}, rNum;
    if( n >= keys.length )
      return src;
    else {
      do{
        rNum = Math.floor(Math.random() * keys.length);
	if( !(keys[rNum] in tmp) ){
	  tmp[ keys[rNum] ] = 1;
	  result[ keys[rNum] ] = src[ keys[rNum] ];
	}
      }while( Object.keys(result).length != n );
    }
    return result;
  },
  getOldestKey: function(dictio){
    var keys = Object.keys(dictio);
    if( keys.length == 0 ){
      console.log('gossipUtil: Empty dictionary');
      return null;
    }
    var maxValue = dictio[keys[0]].timeStamp;
    var maxIndx = keys[0];
    var i = 1;
    while( i < keys.length ){
      if( dictio[keys[i]].timeStamp > maxValue ){
        maxValue = dictio[keys[i]].timeStamp;
	maxIndx = keys[i];
      }
      i += 1;
    }
    return maxIndx;
  },
  getGossipLog: function(loop, thisPeer, cyclonLog, vicinityLog){
    return '{' + loop + '_' + thisPeer + '_' + cyclonLog + '_' + vicinityLog + '}';
  }
}

exports.gossipUtil = gossipUtil;

})(this);
