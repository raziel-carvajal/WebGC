(function(exports){

  function Cyclon(viewSize, gossipLength){
    this.C = viewSize; this.view = {};
    this.gossipLength = gossipLength;
  }

  Cyclon.prototype._selectPeer = function(){
    return gossipUtil.getOldestKey(this.view);
  };

  Cyclon.prototype._getItemsToSend = function(thisId, dstPeer, thread){
    var subDict = {};
    switch( thread ){
      case 'active':
        delete this.view[dstPeer];
        subDict = gossipUtil.getRandomSubDict(this.gossipLength - 1, this.view);
        subDict[thisId] = gossipUtil.newItem(0, 'null');
      break;
      case 'passive':
        subDict = gossipUtil.getRandomSubDict(this.gossipLength, this.view);
      break;
      default:
        console.log('Unknown selection policy');
      break;
    }
    return subDict;
  };

  Cyclon.prototype._selectItemsToKeep = function(thisId, rcvCache){
    var rcvKeys = Object.keys(rcvCache);
    if( rcvKeys.length === 0 )
      return;
    var i;
    var currentKeys = Object.keys(this.view);
    if( currentKeys.length === 0 ){
      i = 0;
      do{
        this.view[ rcvKeys[i] ] = rcvCache[ rcvKeys[i] ];
        i += 1;
      }while( i < rcvKeys.length && Object.keys(this.view).length < this.C );
    }else{
      var newCache = {};
      if( thisId in rcvCache ){
        delete rcvCache[thisId];
        rcvKeys = Object.keys(rcvCache);
      }
      for( i = 0; i < rcvKeys.length; i += 1 ){
        if( !(rcvKeys[i] in this.view) )
          newCache[ rcvKeys[i] ] = rcvCache[ rcvKeys[i] ];
      }
      i = 0;
      while( Object.keys(newCache).length <= this.C && i < currentKeys.length ){
        newCache[ currentKeys[i] ] = this.view[ currentKeys[i] ];
        i += 1;
      }
      this.view = newCache;
    }
  };

  Cyclon.prototype._initialize = function(keys){
    if( keys.length > 0 ){
      for( var i in keys )
        this.view[ keys[i] ] = gossipUtil.newItem(0, 'null');
    }
  };

  Cyclon.prototype._increaseAge = function(){
    for( var key in this.view )
      this.view[key].age += 1;
  };

  Cyclon.prototype._setData = function(key, data){ this.view[key].data = data; };

  Cyclon.prototype._getLog = function(){
    var cacheTrace = '['; var limit;
    var cacheKeys = Object.keys(this.view);
    if( cacheKeys.length === 0 )
      cacheTrace += ']';
    else{
      limit = cacheKeys.length - 1;
      for(var i = 0; i < limit; i += 1)
        cacheTrace += '(' + cacheKeys[i] + ', ' + this.view[ cacheKeys[i] ].age + '), ';
      cacheTrace += '(' + cacheKeys[limit] + ', ' + this.view[ cacheKeys[limit] ].age + ')]';
    }
    return cacheTrace;
  };

  exports.Cyclon = Cyclon;

})(this);

