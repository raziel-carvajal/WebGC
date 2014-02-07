(function(exports){

function Cyclon(cacheSize, gossipLength){
  this.cacheSize = cacheSize;this.cache = {};
  this.gossipLength = gossipLength;
}

Cyclon.prototype._selectItemsToSend = function(thisId, dstPeer){
  for(var key in this.cache){ this.cache[key].timeStamp += 1; }
  delete this.cache[dstPeer];
  var subDict = gossipUtil.getRandomSubDict(this.gossipLength - 1, this.cache);
  subDict[thisId] = gossipUtil.newItem(0, 'void');
  return subDict;
}

Cyclon.prototype._selectItemsToKeep = function(thisId, rcvCache){
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
}

Cyclon.prototype._initialize = function(keys){
  if( keys.length !== 0 ){
    for( var i in keys )
      this.cache[ keys[i].id ] = gossipUtil.newItem(0, keys[i].data);
  }
}

Cyclon.prototype._getLog = function(){
  var cacheTrace = '['; var limit;
  var cacheKeys = Object.keys(this.cache);
  if(cacheKeys.length == 0)
    cacheTrace += ']';
  else{
    limit = cacheKeys.length - 1;
    for(var i = 0; i < limit; i += 1)
      cacheTrace += '(' + cacheKeys[i] + ', ' + this.cache[ cacheKeys[i] ].timeStamp + '), ';
    cacheTrace += '(' + cacheKeys[limit] + ', ' + this.cache[ cacheKeys[limit] ].timeStamp + ')]';
  }
  return cacheTrace;
}

exports.Cyclon = Cyclon;

})(this);

