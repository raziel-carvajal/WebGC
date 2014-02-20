(function(exports){

function Vicinity(cacheSize, gossipLength, proximityVal){
  this.cacheSize = cacheSize;this.cache = {};
  this.gossipLength = gossipLength;
  this.proximityFunc = new DumbProximityFunc(proximityVal);
}

Vicinity.prototype._selectItemsToSendRandom = function(thisId, dstPeer){
  delete this.cache[dstPeer];
  var subDict = gossipUtil.getRandomSubDict(this.gossipLength - 1, this.cache);
  subDict[thisId] = gossipUtil.newItem(0, 'void');
  return subDict;
};

Vicinity.prototype._selectItemsToSendBiased = function(thisId, dstPeer){
  delete this.cache[dstPeer];
  var subDict = this.proximityFunc._getClosestSubdic(this.gossipLength, this.cache);
  subDict[thisId] = gossipUtil.newItem(0, this.proximityFunc.proxVal);
  return subDict;
};

Vicinity.prototype._selectItemsToSendAggrBiased = function(thisId, dstPeer){

};

Vicinity.prototype._selectItemsToKeep = function(thisId, rcvCache){
  var rcvKeys = Object.keys(rcvCache);
  if( rcvKeys.length === 0 )
    return;
  var i;
  var currentKeys = Object.keys(this.cache);
  if( currentKeys.length === 0 ){
    i = 0;
    do{
      this.cache[ rcvKeys[i] ] = rcvCache[ rcvKeys[i] ];
      i += 1;
    }while( i < rcvKeys.length && Object.keys(this.cache).length < this.cacheSize );
  }else{
    var newCache = {};
    if( thisId in rcvCache ){
      delete rcvCache[thisId];
      rcvKeys = Object.keys(rcvCache);
    }
    for( i = 0; i < rcvKeys.length; i += 1 ){
      if( !(rcvKeys[i] in this.cache) )
        newCache[ rcvKeys[i] ] = rcvCache[ rcvKeys[i] ];
    }
    i = 0;
    while( Object.keys(newCache).length <= this.cacheSize && i < currentKeys.length ){
      newCache[ currentKeys[i] ] = this.cache[ currentKeys[i] ];
      i += 1;
    }
    this.cache = newCache;
  }
};

Vicinity.prototype._initialize = function(dict){
  if( dict !== {} ){
    var keys = Object.keys(dict);
    for( var key in keys )
      this.cache[key] = gossipUtil.newItem(dict[key].timeStamp, dict[key].payload);
  }
};

Vicinity.prototype._getLog = function(){
  var cacheTrace = '['; var limit;
  var cacheKeys = Object.keys(this.cache);
  if(cacheKeys.length === 0)
    cacheTrace += ']';
  else{
    limit = cacheKeys.length - 1;
    for(var i = 0; i < limit; i += 1)
      cacheTrace += '(' + cacheKeys[i] + ', ' + this.cache[ cacheKeys[i] ].payload + '), ';
    cacheTrace += '(' + cacheKeys[limit] + ', ' + this.cache[ cacheKeys[limit] ].payload + ')]';
  }
  return this.proximityFunc.proxVal + '_' + cacheTrace;
};

exports.Vicinity = Vicinity;
})(this);
