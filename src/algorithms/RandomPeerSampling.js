/** 
 * @module lib/algorithms */
(function(exports){
  /**
  * @class SamplingService
  * @description This class implements the Random Peer Sampling (RPS) service. 
  * The local view is basically a set of ID's, each ID identifies a remote 
  * peer.The implementation of the view GossipProtocol.view is an object 
  * where the ID of a remote peer is a key and each key points to an 
  * {@link Item} that contains an age field (timestamp) and a data field 
  * (application dependent).
  * @param {Object} opts - Object with settings of the protocol.
  * @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr>*/
  function SamplingService(opts){
    this.log = new Logger(opts.loggingServer, opts.peerId, 'SamplingService');
    this.gossipUtil = new GossipUtil({
      loggingServer: opts.loggingServer,
      peerId: opts.peerId, objName: 'SamplingService'
    });
    GossipProtocol.call(this, opts);
    /** Peer selection policy, there are two possible values for this 
    * parameter: 'random' OR 'oldest' */
    this.selectionPolicy = opts.selectionPolicy;
    // Healing parameter of the RPS service
    this.H = opts.H;
    // Swapped parameter of the RPS service
    this.S = opts.S;
    this.inVandNonReturned = {};
  }
  /**
  * @description This object represents the configuration by default of this protocol. During the
  * instantiation of this object (via the Factory object) if the options are not defined
  * the default configuration will be taken into account. 
  * @property {Object} defaultOpts - Default configuration of this gossip-based protocol.
  * @default */
  SamplingService.defaultOpts = {
    class: 'SamplingService',
    data: '?',
    viewSize: 10,
    fanout: 5,
    periodTimeOut: 10000,
    propagationPolicy: { push: true, pull: true },
    selectionPolicy: 'oldest',// random OR oldest
    H: 5,//healer configuration
    S: 0
  };
  util.inherits(SamplingService, GossipProtocol);
  /** 
  * @method initialize
  * @description See method GossipProtocol.initilize() for more information.*/
  SamplingService.prototype.initialize = function(keys){
    if( keys.length !== 0 ){
      var i = 0;
      while(i < this.viewSize && i < keys.length){
        this.view[ keys[i] ] = this.gossipUtil.newItem(0, '?');
        this.inVandNonReturned[ keys[i] ] = 1;
        i++;
      }
    }
  };
  /**
  * @method selectPeer
  * @description The selection of the peer identifier is performed in a randomly way or taking into account 
  * the oldest one. See method GossipProtocol.selectPeer() for more information.*/
  SamplingService.prototype.selectPeer = function(){
    var peer; var keys = Object.keys(this.inVandNonReturned);
    if( keys.length === 0 ){
      this.log.warn('The quality of returned samples is no longer reliable');
      peer = this.gossipUtil.getRandomKey(this.view);
    }else{
      switch( this.selectionPolicy ){
        case 'random':
          peer = keys[0];
        break;
        case 'oldest':
          peer = this.gossipUtil.getOldestKey(this.view);
        break;
        default:
          this.log.error('The selection policy is not recognized');
        peer = keys[0];
        break;
      }
      delete this.inVandNonReturned[peer];
    }
    return peer;
  };
  /** 
  * @method permuteView
  * @description This method changes, in a randomly way, the order of the view GossipProtocol.view */
  SamplingService.prototype.permuteView = function(){
    var keys = Object.keys(this.view);
    if( keys.length === 0 || keys.length === 1 )
      return;
    else{
      var tmpDic = {}, permutation = {}, tmpAr = [], i, key;
      for( i = 0; i < keys.length; i++ )
        tmpDic[ keys[i] ] = 1;
      for( i = 0; i < keys.length; i++){
        tmpAr = Object.keys(tmpDic);
        key = tmpAr[ Math.floor(Math.random() * tmpAr.length) ];
        permutation[key] = this.view[key];
        delete tmpDic[key]; delete this.view[key];
      }
      var keysP = Object.keys(permutation);
      for( i = 0; i < keysP.length; i++ )
        this.view[ keysP[i] ] = permutation[ keysP[i] ];
    }
  };
  /**
  * @method moveOldest
  * @description This method changes the order of the view GossipProtocol.view, moving the oldest 
  * SamplingService.H items (according to their timestamp) at the end of the view. */ 
  SamplingService.prototype.moveOldest = function(){
    if( Object.keys(this.view).length > this.H && this.H > 0 ){
      var oldests = [], oldestKey, i;
      for( i = 0; i < this.H; i++ ){
        oldestKey = this.gossipUtil.getOldestKey(this.view);
        oldests[i] = { key: oldestKey, value: this.view[oldestKey] };
        delete this.view[oldestKey];
      }
      oldests.sort( function(a,b){ return (a.value.age - b.value.age); } );
      for( i = 0; i < oldests.length; i++ )
        this.view[ oldests[i].key ] = oldests[i].value;
    }
  };
  /**
  * @method selectItemsToKeep
  * @description See method GossipProtocol.selectItemsToKeep() for more information. */
  SamplingService.prototype.selectItemsToKeep = function(thisId, rcvCache){
    var i, keys = Object.keys(rcvCache);
    for( i = 0; i < keys.length; i++ ){
      if( keys[i] in this.view ){
        if( rcvCache[ keys[i] ].age < this.view[ keys[i] ].age )
          this.view[ keys[i] ] = rcvCache[ keys[i] ];
      }
      else
        this.view[ keys[i] ] = rcvCache[ keys[i] ];
    }
    var oldest, toRemove;
    toRemove = Math.min(this.H, Object.keys(this.view).length - this.viewSize);
    for( i = 0; i < toRemove; i++ ){
      oldest = this.gossipUtil.getOldestKey(this.view);
      delete this.view[oldest];
    }
    toRemove = Math.min(this.S, Object.keys(this.view).length - this.viewSize);
    keys = Object.keys(this.view);
    for( i = 0; i < toRemove; i++ )
      delete this.view[ keys[i] ];
    keys = Object.keys(this.view);
    if( keys.length > this.viewSize )
      this.gossipUtil.removeRandomly(keys.length - this.viewSize, this.view);
    // Queue update
    keys = Object.keys(this.inVandNonReturned);
    for( i = 0; i < keys.length; i++ ){
      if( !(keys[i] in this.view) )
        delete this.inVandNonReturned[ keys[i] ];
    }
    keys = Object.keys(this.view);
    for( i = 0; i < keys.length; i++ ){
      if( !(keys[i] in this.inVandNonReturned) )
        this.inVandNonReturned[ keys[i] ] = 1;
    }
  };
  /**
  * @method getItemsToSend
  * @description See method GossipProtocol.getItemsToSend() for more information. */
  SamplingService.prototype.getItemsToSend = function(thisId, dstPeer, thread){
    var buffer = {}; buffer[thisId] = this.gossipUtil.newItem(0, this.data);
    this.permuteView();
    this.moveOldest();
    var ii = Math.floor(this.viewSize / 2) - 1;
    var keys = Object.keys(this.view);
    if( keys.length >= ii ){
      for( var i = 0; i < ii; i++ )
        buffer[ keys[i] ] = this.view[ keys[i] ];
    }
    return buffer;
  };
  /** 
  * @method increaseAge
  * @description See method GossipProtocol.increaseAge() for more information. */
  SamplingService.prototype.increaseAge = function(){
    var keys = Object.keys(this.view);
    for( var i = 0; i < keys.length; i++ )
      this.view[ keys[i] ].age += 1;
  };
  /** 
  * @method getLog
  * @description See method GossipProtocol.getLog() for more information. */
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
  /**
  * @method getPlotInfo
  * @description See GossipProtocol.getPlotInfo for more information.*/
  SamplingService.prototype.getPlotInfo = function(peerId){
    return {peer: peerId, profile: this.data, loop: this.loop, view: Object.keys(this.view)};
  };
  
  exports.SamplingService = SamplingService;
  
})(this);
