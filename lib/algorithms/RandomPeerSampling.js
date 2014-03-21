(function(exports){
  /**
  * @class SamplingService
  * @classdesc This class implements the Random Peer Sampling (RPS) service. 
  * The local view is basically a set of ID's, each ID identifies a remote 
  * peer.The implementation of {@link SamplingService.view} is an object 
  * where the ID of a remote peer is a key and each key points to an 
  * {@link Item} that contains an age field (timestamp) and a data field 
  * (application dependent).
  * @param {Object} options - Object that contains a valid configuration of
  * the gossip-based protocol.
  * @param {Boolean} push - Data exchange policy that indicates if the local 
  * peer is able to send data.
  * @param {Boolean} pull - Data exchange policy that indicates if the local
  * peer is able to receive data.
  * @param {integer} viewSize - Size of the local view. */
  function SamplingService(options){
    this.prototype = Object.create( new GossipProtocol(options) );
    /** Peer selection policy, there are two possible values for this 
    * parameter: 'random' OR 'oldest' */
    this.selectionPolicy = options.selectionPolicy;
    // Healing parameter of the RPS service
    this.H = options.H;
    // Swapped parameter of the RPS service
    this.S = options.S;
    this.view = {}; this.inVandNonReturned = {};
  }
  SamplingService.defaultOpts = {
    data: '?',
    viewSize: 10,
    gossipLenght: 5,
    periodTime: 10000,
    propagationPolicy: { push: true, pull: true },
    selectionPolicy: 'random', // random OR oldest
    H: '?',
    S: '?'
  };
  /** 
  * This method initilize {@link SamplingService.view} with the peer identifiers
  * contained in {@link keys}.
  * @method initialize
  * @param {Array} keys - Array of peer IDs. */
  SamplingService.prototype.initialize = function(keys){
    if( keys.length !== 0 ){
      for( var i = 0; i < keys.length; i += 1 ){
        this.view[ keys[i] ] = gossipUtil.newItem(0, '?');
        this.inVandNonReturned[ keys[i] ] = 1;
      }
    }
  };
  /** 
  * This method selects one peer from {@link SamplingService.view} according 
  * to the selection policy {@link SamplingService.selectionPolicy}.
  * @method selectPeer
  * @returns {String} - ID of one remote peer. */
  SamplingService.prototype.selectPeer = function(){
    var peer; var keys = Object.keys(this.inVandNonReturned);
    if( keys.length === 0 ){
      console.log('WARNING: The quality of returned samples is no longer reliable');
      peer = gossipUtil.getRandomKey(this.view);
    }else{
      switch( this.selectionPolicy ){
        case 'random':
          peer = keys[0];
        break;
        case 'oldest':
          peer = gossipUtil.getOldestKey(this.view);
        break;
        default:
          console.log('ERROR: The selection policy is not recognized');
        peer = keys[0];
        break;
      }
      delete this.inVandNonReturned[peer];
    }
    return peer;
  };
  /** 
  * This method changes, in a randomly way, the order of {@link SamplingService.view} .
  * @method permuteView */
  SamplingService.prototype.permuteView = function(){
    var keys = Object.keys(this.view);
    if( keys.length === 0 || keys.length === 1 )
      return;
    else{
      var tmpDic = {}, permutation = {}, tmpAr = [], i, key;
      for( i = 0; i < keys.length; i +=1 )
      tmpDic[ keys[i] ] = 1;
      for( i = 0; i < keys.length; i += 1){
        tmpAr = Object.keys(tmpDic);
        key = tmpAr[ Math.floor(Math.random() * tmpAr.length) ];
        permutation[key] = this.view[key];
        delete tmpDic[key]; delete this.view[key];
      }
      for( key in permutation )
        this.view[key] = permutation[key];
    }
  };
  /**
  * This changes the order of {@link SamplingService.view}, moving the oldest 
  * {@link SamplingService.H} items (according to their timestamp) at the end
  * of the view.
  * @method moveOldest
  */ 
  SamplingService.prototype.moveOldest = function(){
    if( Object.keys(this.view).length > this.H && this.H > 0 ){
      var oldests = [], oldestKey, i;
      for( i = 0; i < this.H; i += 1 ){
        oldestKey = gossipUtil.getOldestKey(this.view);
        oldests[i] = { key: oldestKey, value: this.view[oldestKey] };
        delete this.view[oldestKey];
      }
      oldests.sort( function(a,b){ return (a.value.age - b.value.age); } );
      for( i = 0; i < oldests.length; i += 1 )
      this.view[ oldests[i].key ] = oldests[i].value;
    }
  };
  /**
  * This method merges the received set of items in {@link rcvCache} with the
  * view {@link SamplingService.view} keeping at most {@link GossipProtocol.viewSize} 
  * items in the view.
  * @method selectItemsToKeep
  * @param {Object} rcvCache - The set of items to merge. */
  SamplingService.prototype.selectItemsToKeep = function(thisId, rcvCache){
    var key;
    for( key in rcvCache ){
      if( key in this.view ){
        if( rcvCache[key].age < this.view[key].age )
          this.view[key] = rcvCache[key];
      }
      else
        this.view[key] = rcvCache[key];
    }
    var oldest, toRemove; var i;
    toRemove = Math.min(this.H, Object.keys(this.view).length - this.viewSize);
    for( i = 0; i < toRemove; i += 1 ){
      oldest = gossipUtil.getOldestKey(this.view);
      delete this.view[oldest];
    }
    toRemove = Math.min(this.S, Object.keys(this.view).length - this.viewSize);
    var keys = Object.keys(this.view);
    for( i = 0; i < toRemove; i += 1 )
    delete this.view[ keys[i] ];
    keys = Object.keys(this.view);
    if( keys.length > this.viewSize )
      gossipUtil.removeRandomly(keys.length - this.viewSize, this.view);
    // Queue update
    keys = Object.keys(this.inVandNonReturned);
    for( i = 0; i < keys.length; i += 1 ){
      if( !(keys[i] in this.view) )
        delete this.inVandNonReturned[ key[i] ];
    }
    keys = Object.keys(this.view);
    for( i = 0; i < keys.length; i += 1 ){
      if( !(keys[i] in this.inVandNonReturned) )
        this.inVandNonReturned[ keys[i] ] = 1;
    }
  };
  /**
  * This method gets half of the items in {@link SamplingService.view} for
  * being sent to a remote peer.
  * @method getItemsToSend
  * @param {String} thisId - The ID of the local peer.
  * @returns {Object} - Subset of {@link SamplingService.view}.*/
  SamplingService.prototype.getItemsToSend = function(thisId, dstPeer, thread){
    var buffer = {}; buffer[thisId] = gossipUtil.newItem(0, this.data);
    this.permuteView();
    this.moveOldest();
    var ii = Math.floor(this.viewSize / 2) - 1;
    var keys = Object.keys(this.view);
    if( keys.length >= ii ){
      for( var i = 0; i < ii; i += 1 )
      buffer[ keys[i] ] = this.view[ keys[i] ];
    }
    return buffer;
  };
  /** 
  * This method increments the age of each item in {@link SamplingService.view}.
  * @method increaseAge */
  SamplingService.prototype.increaseAge = function(){
    var keys = Object.keys(this.view);
    for( var i = 0; i < keys.length; i++ )
      this.view[ keys[i] ].age += 1;
  };
  /** 
  * This method obtains a string representation of {@link SamplingService.view}. 
  * Basically, the string is a set of tuples where each tuple has two entries, the 
  * first entry is an ID of a remote peer and the second entry is its timestamp. 
  * @method getLog
  * @returns {String} - String representation of {@link SamplingService.view}.*/
  SamplingService.prototype.getLog = function(){
    var trace = '['; var limit;
    var keys = Object.keys(this.view);
    if( keys.length === 0 )
      trace += ']';
    else{
      limit = keys.length - 1;
      for(var i = 0; i < limit; i += 1)
      trace += '(' + keys[i] + ', ' + this.view[ keys[i] ].age + '), ';
      trace += '(' + keys[limit] + ', ' + this.view[ keys[limit] ].age + ')]';
    }
    return trace;
  };

  exports.SamplingService = SamplingService;

})(this);
