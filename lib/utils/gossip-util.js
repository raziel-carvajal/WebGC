(function(exports){ 

var gossipUtil = {
  newItem: function(age, data){
    return { age: age, data: data };
  },

  getRandomSubDict: function(n, src){
    if( n <= 0 || Object.keys(src).length === 0 )
      return {};
    if( n >= Object.keys(src).length )
      return src;
    else {
      var tmpDict = result = {}, key, tmpSize, tmpAr, i;
      for( key in src )
        tmpDict[key] = 1;
      i = 0;
      do{
	tmpAr = Object.keys(tmpDict);
	tmpSize = tmpAr.length;
        key = tmpAr[ Math.floor(Math.random() * tmpSize) ];
	result[key] = src[key];
	delete tmpDict[key];
	i += 1;
      }while( i != n );
    }
    return result;
  },

  getOldestKey: function(dictio){
    var keys = Object.keys(dictio);
    if( keys.length == 0 ){
      console.log('ERROR: Empty dictionary');
      return null;
    }
    var max = dictio[ keys[0] ].age;
    var maxIndx = keys[0];
    var i = 1;
    while( i < keys.length ){
      if( dictio[ keys[i] ].age > max ){
        max = dictio[ keys[i] ].age;
	maxIndx = keys[i];
      }
      i += 1;
    }
    return maxIndx;
  },
  getGossipLog: function(loop, thisPeer, cyclonLog, vicinityLog){
    return '{' + loop + '_' + thisPeer + '_' + cyclonLog + '_' + vicinityLog + '}';
  },
  // Get a random key from a dictionary
  getRandomKey: function(dict){
    var key = null;
    if( dict === {})
      console.log('ERROR: no way to return a key from an empty dictionary');
    else{
      var keys = Object.keys(dict);
      var rNum = null;
      if( keys.length === 1 )
        rNum = 0;
      else
        rNum = Math.floor(Math.random() * keys.length);
      key = keys[rNum];
    }
    return key;
  }
}

exports.gossipUtil = gossipUtil;

})(this);
