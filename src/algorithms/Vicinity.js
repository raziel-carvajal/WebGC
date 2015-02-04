/**
* @module lib/algorithms */
(function(exports){
  /**
  * @class Vicinity
  * @description This class implements the gosip-based algoritm Vicinity. The local view 
  * is basically a set of ID's, each ID identifies a remote peer.The implementation of 
  * the view GossipProtocol.view is a dictionary where the ID of a remote peer is a key and 
  * each key points to an {@link Item} which contains an age field (timestamp) and a 
  * data field (application dependent).
  * @param {Object} opts - Settings for the protocol.
  * @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr> */
  function Vicinity(opts){
    this.log = new Logger(opts.loggingServer, opts.peerId, 'Vicinity');
    this.gossipUtil = new GossipUtil({
      loggingServer: opts.loggingServer,
      peerId: opts.peerId,
      objName: 'Vicinity'
    });
    GossipProtocol.call(this, opts);
    this.selectionPolicy = opts.selectionPolicy;
    /**
    * Property: "this.proximityFunc", is filled by the GossipFactory at execution time
    **/
    this.proximityFunc.cluView = this.view;
  }
  /**
  * @description This object represents the configuration by default of this protocol. During the
  * instantiation of this object (via the Factory object) if the options are not defined
  * the default configuration will be taken into account. 
  * @property {Object} defaultOpts - Default configuration of this gossip-based protocol.
  * @default */
  Vicinity.defaultOpts = {
    class: 'Vicinity',
    data: '?',
    viewSize: 10,
    fanout: 5,
    periodTimeOut: 10000,
    propagationPolicy: {push: true, pull: true},
    selectionPolicy: 'biased' // random OR biased OR agr-biased
  };
  // the util object belongs to PeerJS
  util.inherits(Vicinity, GossipProtocol);
  /** 
  * @method selectPeer
  * @description This method selects the remote peer's identifier with the oldest age. See method 
  * GossipProtocol.selectPeer() for more information.*/
  Vicinity.prototype.selectPeer = function(){ return this.gossipUtil.getOldestKey(this.view); };
  /**
  * @method selectItemsToSend
  * @description The selection of items is performed following one of the next cases: i) if 
  * selection='random' items from GossipProtocol.view are chosen 
  * in a randomly way, ii) if selection='biased' the most similar 
  * GossipProtocol.fanout items are chosen from GossipProtocol.view
  * and iii) if selection='agr-biased' the most similar 
  * GossipProtocol.fanout items are chosen from the views Vicinity.rpsView and 
  * GossipProtocol.view ;see method GossipProtocol.selectItemsToSend() for more information.*/
  Vicinity.prototype.selectItemsToSend = function(thisId, dstPeer, thread){
    var itmsNum, newItem = null;
    switch( thread ){
      case 'active':
        delete this.view[dstPeer];
        itmsNum = this.fanout - 1;
      break;
      case 'passive':
        itmsNum = this.fanout;
      break;
      default:
        itmsNum = 0;
      break;
    }
    if(thread === 'active')
      newItem = this.gossipUtil.newItem(0, this.proximityFunc.profile);
    switch( this.selectionPolicy ){
      case 'random':
        var subDict = this.gossipUtil.getRandomSubDict(itmsNum, this.view);
        if(newItem !== null)
          subDict[thisId] = newItem;
        this.coordi.sendTo(dstPeer, subDict, this.protoId);
      break;
      case 'biased':
        if(newItem !== null)
          this.proximityFunc.getClosestNeighbours(itmsNum, this.view, {k: thisId, v: newItem});
        else
          this.proximityFunc.getClosestNeighbours(itmsNum, this.view, null);
      break;
      case 'agr-biased':
        var mergedV = this.gossipUtil.mergeViews(this.view, this.rpsView);
        if(newItem !== null)
          this.proximityFunc.getClosestNeighbours(itmsNum, mergedV, {k: thisId, v: newItem});
        else
          this.proximityFunc.getClosestNeighbours(itmsNum, mergedV, null);
      break;
      default:
        this.log.error('Unknown peer selection policy');
      break;
    }
  };
  /**
  * @method selectItemsToKeep
  * @description See method GossipProtocol.selectItemsToKeep() for more information. */
  Vicinity.prototype.selectItemsToKeep = function(thisId, rcvCache){
    var tmp = this.gossipUtil.mergeViews(this.view, rcvCache);
    var mergedViews = this.gossipUtil.mergeViews(tmp, this.rpsView);
    if( thisId in mergedViews )
      delete mergedViews[thisId];
    this.view = this.proximityFunc.getClosestNeighbours(this.viewSize, mergedViews);
  };
  /** 
  * @method initialize
  * @description See method GossipProtocol.initialize() for more information. */
  Vicinity.prototype.initialize = function(keys){
    if( keys.length > 0 ){
      var i = 0;
      while(i < this.viewSize && i < keys.length){
        this.view[ keys[i] ] = this.gossipUtil.newItem(0, '?');
        i++;
      }
    }
  };
  /** 
  * @method increaseAge
  * @description See method GossipProtocol.increaseAge() for more information. */
  Vicinity.prototype.increaseAge = function(){
    var keys = Object.keys(this.view);
    for( var i = 0; i < keys.length; i++ )
      this.view[ keys[i] ].age++;
  };
  /**
  * @method getSimilarPeerIds
  * @description This method gives n peer identifiers from GossipProtocol.view
  * These peers have the higher degree of similarity with the local peer.
  * @param {Integer} n - Number of the required peer IDs.
  * @returns {Array} Array of n peer IDs. */ 
  Vicinity.prototype.getSimilarPeerIds = function(n){
    if( n <= 0)
      return [];
    var iDs = Object.keys(this.view);
    if( n >= iDs.length )
      return iDs;
    else{
      var result = [];
      for(var i = 0; i < n; i++)
        result.push( iDs[i] );
      return result;
    }
  };
  /** 
  * @method getLog
  * @description See method GossipProtocol.getLog() for more information. */
  Vicinity.prototype.getLog = function(){
    var cacheTrace = '[', limit, similarity, neigVal;
    var cacheKeys = Object.keys(this.view);
    if(cacheKeys.length === 0)
      cacheTrace += ']';
    else{
      limit = cacheKeys.length - 1;
      for(var i = 0; i < limit; i++){
        neigVal = this.view[ cacheKeys[i] ].data;
        similarity = '?';
        //similarity = this.proximityFunc.compute(this.proximityFunc.profile, neigVal);
        cacheTrace += '(' + cacheKeys[i] + ', ' + similarity + ', ' + this.view[ cacheKeys[i] ].age + '), ';
      }
      neigVal = this.view[ cacheKeys[limit] ].data;
      similarity = '?';
      //similarity = this.proximityFunc.compute(this.proximityFunc.profile, neigVal);
      cacheTrace += '(' + cacheKeys[limit] + ', ' + similarity + ', ' + this.view[ cacheKeys[limit] ].age + ')]';
    }
    return this.proximityFunc.profile + '_' + cacheTrace;
  };
  /**
  * @description See method GossipProtocol.getPlotInfo() for more information.*/
  Vicinity.prototype.getPlotInfo = function(peerId){
    return { peer: peerId, profile: this.proximityFunc.profile, loop: this.loop, 'view': Object.keys(this.view) };
  };
  exports.Vicinity = Vicinity;
})(this);
