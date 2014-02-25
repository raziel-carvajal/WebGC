(function(exports){

  function Vicinity(viewSize, gossipLength, simVal, rpsView){
    this.C = viewSize;
    this.view = {};
    this.gossipLength = gossipLength;
    this.proximityFunc = new DumbProximityFunc(simVal);
    this.rpsView = rpsView;
  }

  Vicinity.prototype._selectPeer = function(){
    return gossipUtil.getOldestKey(this.view);
  };

  Vicinity.prototype._getItemsToSend = function(thisId, dstPeer, selection){
    var subDict = {};
    delete this.view[dstPeer];
    switch( selection ){
      case 'random':
        subDict = gossipUtil.getRandomSubDict(this.gossipLength - 1, this.view);
      break;
      case 'biased':
        subDict = this.proximityFunc._getClosestSubdic(this.gossipLength - 1, this.view);
      break;
      case 'agr-biased':
        var mergedV = gossipUtil.mergeViews(this.view, this.rpsView);
        subDict = this.proximityFunc._getClosestSubdic(this.gossipLength - 1, mergedV);
      break;
      default:
        console.log('Unknown peer selection policy');
      break;
    }
    subDict[thisId] = gossipUtil.newItem(0, this.proximityFunc.proxVal);
    return subDict;
  };

  Vicinity.prototype._selectItemsToKeep = function(thisId, rcvCache){
    var tmp = gossipUtil.mergeViews(this.view, rcvCache);
    var mergedViews = gossipUtil.mergeViews(tmp, this.rpsView);
    if( thisId in mergedViews )
      delete mergedViews[thisId];
    this.view = this.proximityFunc._getClosestSubdic(this.C, mergedViews);
  };

  Vicinity.prototype._initialize = function(keys){
    if( keys.length > 0 ){
      for( var i in keys )
        this.view[ keys[i] ] = gossipUtil.newItem(0, 'null');
    }
  };

  Vicinity.prototype._increaseAge = function(){
    for( var key in this.view )
      this.view[key].age += 1;
  };

  Vicinity.prototype._getLog = function(){
    var cacheTrace = '[', limit, similarity, neigVal;
    var cacheKeys = Object.keys(this.view);
    if(cacheKeys.length === 0)
      cacheTrace += ']';
    else{
      limit = cacheKeys.length - 1;
      for( var i = 0; i < limit; i += 1 ){
        neigVal = this.view[ cacheKeys[i] ].data;
        similarity = this.proximityFunc._eval(this.proximityFunc.proxVal, neigVal);
        cacheTrace += '(' + cacheKeys[i] + ', ' + similarity + '), ';
      }
      neigVal = this.view[ cacheKeys[limit] ].data;
      similarity = this.proximityFunc._eval(this.proximityFunc.proxVal, neigVal);
      cacheTrace += '(' + cacheKeys[limit] + ', ' + similarity + ')]';
    }
    return this.proximityFunc.proxVal + '_' + cacheTrace;
  };

  exports.Vicinity = Vicinity;
})(this);
