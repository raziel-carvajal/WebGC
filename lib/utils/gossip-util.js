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
      var tmpDict = {}, result = {}, key, tmpAr, i;
      for( key in src )
        tmpDict[key] = 1;
      i = 0;
      do{
        tmpAr = Object.keys(tmpDict);
        key = tmpAr[ Math.floor(Math.random() * tmpAr.length) ];
        result[key] = src[key];
        delete tmpDict[key];
        i += 1;
      }while( i != n );
    }
    return result;
  },

  getOldestKey: function(dictio){
    var keys = Object.keys(dictio);
    if( keys.length === 0 ){
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
    var key = null; var keys = Object.keys(dict);
    var dicSize = keys.length;
    if( dicSize === 0 )
      console.log('ERROR: no way to return a key from an empty dictionary');
    else{
      var rNum;
      if( dicSize === 1 )
        rNum = 0;
      else
        rNum = Math.floor(Math.random() * dicSize);
      key = keys[rNum];
    }
    return key;
  },
  removeRandomly: function(n, dic){
    if( n === 0 )
      return;
    else{
      var tmpDic = {}, tmpAr, key;
      for( key in dic )
        tmpDic[key] = 1;
      for( var i = 0; i < n; i += 1 ){
        tmpAr = Object.keys(tmpDic);
        key = tmpAr[ Math.floor(Math.random() * tmpAr.length) ];
        delete tmpDic[key]; delete dic[key];
      }
    }
  }

};

exports.gossipUtil = gossipUtil;

})(this);
