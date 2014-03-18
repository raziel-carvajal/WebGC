(function(exports){
/**
 * @class Cyclon
 * @classdesc This class implements the goosip-base algorithm {@link Cyclon}.
 * The local view is basically a set of ID's, each ID identifies a remote peer.
 * The implementation of {@link Cyclon.view} is a dictionary where the ID of
 * a remote peer is a key and each key points to a {@link Item} which contains
 * an age field (timestamp) and a data field (application dependent).
 * @param {integer} viewSize - Size of the local view.
 * @param {integer} gossipLength - Number of items of a Cyclon message.
 * */
  function Cyclon(viewSize, gossipLength){
    this.C = viewSize; this.view = {};
    this.gossipLength = gossipLength;
  }
  /** 
  * This method selects the remote peer's ID with the oldest age from the view.
  * @method _selectPeer
  * @returns {String} - ID of the remote peer with the oldest age.*/
  Cyclon.prototype._selectPeer = function(){
    return gossipUtil.getOldestKey(this.view);
  };
  /**
  * This method gets a subset of size {@link Cyclon.gossipLength} from the
  * view {@link Cyclon.view}, the items are chosen in a randomly way.
  * @method _getItemsToSend
  * @param {String} thisId - The ID of the local peer.
  * @param {String} dstPeer - The ID of the remote peer.
  * @param {String} thread - Whether the selection is performed in passive 
  * or active mode.
  * @returns {Dictionary} - Subset of the local view.*/
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
  /**
  * This method merges the received set of items {@link rcvCache} with the
  * view {@link Cyclon.view} keeping the size of the view {@link Cyclon.view} 
  * to {@link Cyclon.C}.
  * @method _getItemsToSend
  * @param {String} thisId - The ID of the local peer.
  * @param {String} rcvCache - The set of items to merge. */
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
  /** 
  * This method initilize the view {@link Cyclon.view} with the peer IDs contained
  * in {@link keys}.
  * @method _initialize
  * @param {String[]} keys - Array of peer IDs. */
  Cyclon.prototype._initialize = function(keys){
    if( keys.length > 0 ){
      for( var i in keys )
        this.view[ keys[i] ] = gossipUtil.newItem(0, 'null');
    }
  };
  /** 
  * This method increments the age of each item in the view {@link Cyclon.view}.
  * @method _increaseAge */
  Cyclon.prototype._increaseAge = function(){
    for( var key in this.view )
      this.view[key].age += 1;
  };
  /** 
  * This method updates the value of the property 'data' from one item in the view 
  * {@link Cyclon.view}.
  * @method _setData
  * @param {String} key - ID of the item to update.
  * @param {Data} data - New value for the data property*/
  Cyclon.prototype._setData = function(key, data){ this.view[key].data = data; };
  /** 
  * This method obtains a string representation of {@link Cyclon.view}. Basically,
  * the string is a set of tuples where each tuple has two entries, the first entry
  * is an ID of a remote peer and the second entry is its timestamp. 
  * @method _getLog
  * @returns {String} - String representation of {@link Cyclon.view}.*/
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

