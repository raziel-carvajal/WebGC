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
  function Vicinity(algOpts, log, gossipUtil){
    gossipUtil.inherits(Vicinity, GossipProtocol);
    GossipProtocol.call(this, algOpts, log, gossipUtil);
    this.selectionPolicy = algOpts.selectionPolicy;
    this.simObj = new SimilarityFunction(this.data, log, algOpts.similarityFunction);
    this.dependencies = algOpts.dependencies;
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
  /** 
  * @description This method initialize GossipProtocol.view with the peer identifiers n the array keys.
  * @method initialize
  * @param keys:Array - Array of peer identifiers. */
  Vicinity.prototype.initialize = function(keys){
    if(keys.length > 0){
      var i = 0;
      while(i < this.viewSize && i < keys.length){
        this.view[ keys[i].id ] = this.gossipUtil.newItem(0, keys[i].profile);
        i++;
      }
    }
    this.log.info('initialization of view: ' + JSON.stringify(this.view));
  };
  Vicinity.prototype.setMediator = function(mediator){
    mediator.setDependencies(this.dependencies);
    this.gossipMediator = mediator;
  };
  // the util object belongs to PeerJS
  //util.inherits(Vicinity, GossipProtocol);
  /** 
  * @method selectPeer
  * @description This method selects the remote peer's identifier with the oldest age. See method 
  * GossipProtocol.selectPeer() for more information.*/
  Vicinity.prototype.selectPeer = function(){ return this.gossipUtil.getOldestKey(this.view); };
  Vicinity.prototype.doAgrBiasedSelection = function(payload){};
  /**
  * @method selectItemsToSend
  * @description The selection of items is performed following one of the next cases: i) if 
  * selection='random' items from GossipProtocol.view are chosen 
  * in a randomly way, ii) if selection='biased' the most similar 
  * GossipProtocol.fanout items are chosen from GossipProtocol.view
  * and iii) if selection='agr-biased' the most similar 
  * GossipProtocol.fanout items are chosen from the views Vicinity.rpsView and 
  * GossipProtocol.view ;see method GossipProtocol.selectItemsToSend() for more information.*/
  Vicinity.prototype.selectItemsToSend = function(thread){
    var dstPeer = this.selectPeer();
    var clone = JSON.parse(JSON.stringify(this.view));
    var itmsNum, msg, newItem = null, subDict;
    switch( thread ){
      case 'active':
        delete clone[dstPeer];
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
      newItem = this.gossipUtil.newItem(0, this.simObj.profile);
    switch( this.selectionPolicy ){
      case 'random':
        subDict = this.gossipUtil.getRandomSubDict(itmsNum, clone);
        if(newItem !== null)
          subDict[this.peerId] = newItem;
        msg = {
          header: 'activeMsg',
          emitter: this.peerId,
          receiver: dstPeer,
          payload: subDict,
          algoId: this.algoId
        };
        this.gossipMediator.postInMainThread(msg);
        break;
      case 'biased':
        subDict = this.simObj.getClosestNeighbours(itmsNum, clone, {k: this.peerId, v: newItem});
        if(newItem !== null)
          subDict[this.peerId] = newItem;
        msg = {
          header: 'activeMsg',
          emitter: this.peerId,
          receiver: dstPeer,
          payload: subDict,
          algoId: this.algoId
        };
        this.gossipMediator.postInMainThread(msg);
        break;
      case 'agr-biased':
        msg = {
          cluView: clone,
          n: itmsNum,
          'newItem': newItem,
          receiver: dstPeer,
          emitter: this.algoId,
          callback: 'doAgrBiasedSelection'
        };
        for(var i = 0; i < this.dependencies.length; i++){
          msg.depId = this.dependencies[i].algoId;
          msg.depAtt = this.dependencies[i].algoAttribute;
          this.gossipMediator.applyDependency(msg);
        }
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
    this.log.info('selectItemsToKeep() rcvView: ' + JSON.stringify(rcvCache));
    var tmp = this.gossipUtil.mergeViews(this.view, rcvCache);
    var mergedViews = this.gossipUtil.mergeViews(tmp, this.rpsView);
    this.log.info('mergedView: ' + JSON.stringify(mergedViews));
    if( thisId in mergedViews )
      delete mergedViews[thisId];
    this.proximityFunc.updateClusteringView(this.viewSize, mergedViews, this.view);
    this.log.info('cluView: ' + JSON.stringify(this.view));
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
