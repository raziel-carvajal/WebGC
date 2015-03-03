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
    this.selector = new ViewSelector(this.data, log, algOpts.similarityFunction);
    this.dependencies = algOpts.dependencies;
  }
  
  //GossipUtil.inherits(Vicinity, GossipProtocol);
  
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
  //
  Vicinity.prototype.setMediator = function(mediator){
    mediator.setDependencies(this.dependencies);
    this.gossipMediator = mediator;
  };
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
  Vicinity.prototype.selectItemsToSend = function(thread){
    var dstPeer = this.selectPeer();var clone = JSON.parse(JSON.stringify(this.view));
    var itmsNum, msg, subDict;
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
    var newItem = thread === 'active' ? this.gossipUtil.newItem(0, this.selector.profile) : null;
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
        subDict = this.selector.getClosestNeighbours(itmsNum, clone, {k: this.peerId, v: newItem});
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
          header: 'getDep',
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
  Vicinity.prototype.doAgrBiasedSelection = function(msg){
    var mergedViews = this.gossipUtil.mergeViews(msg.cluView, msg.result);
    var similarNeig = this.selector.getClosestNeighbours(msg.n, mergedViews, {k: this.peerId, v: msg.newItem});
    var payload = {
      header: 'activeMsg',
      emitter: this.peerId,
      receiver: msg.receiver,
      'payload': similarNeig,
      algoId: this.algoId
    };
    this.gossipMediator.postInMainThread(payload);
  };
  /**
  * @method selectItemsToKeep
  * @description See method GossipProtocol.selectItemsToKeep() for more information. */
  Vicinity.prototype.selectItemsToKeep = function(rcvCache){
    this.log.info('selectItemsToKeep() rcvView: ' + JSON.stringify(rcvCache));
    var mergedViews = this.gossipUtil.mergeViews(this.view, rcvCache);
    var msg = {
      header: 'getDep',
      cluView: mergedViews,
      emitter: this.algoId,
      callback: 'doItemsToKeepWithDep'
    };
    for(var i = 0; i < this.dependencies.length; i++){
      msg.depId = this.dependencies[i].algoId;
      msg.depAtt = this.dependencies[i].algoAttribute;
      this.gossipMediator.applyDependency(msg);
    }
  };
  /***/
  Vicinity.prototype.doItemsToKeepWithDep = function(msg){
    var mergedViews = this.gossipUtil.mergeViews(msg.cluView, msg.result);
    if(this.peerId in mergedViews)
      delete mergedViews[this.peerId];
    var similarNeig = this.selector.getClosestNeighbours(this.viewSize, mergedViews, null);
    var keys = Object.keys(this.view), i;
    for(i = 0; i < keys.length; i++){ delete this.view[ keys[i] ]; }
    keys = Object.keys(similarNeig);
    for(i = 0; i < keys.length; i++){ this.view[ keys[i] ] = similarNeig[ keys[i] ]; }
  };
  /** 
  * @method increaseAge
  * @description See method GossipProtocol.increaseAge() for more information. */
  Vicinity.prototype.increaseAge = function(){
    var keys = Object.keys(this.view);
    for(var i = 0; i < keys.length; i++){ this.view[ keys[i] ].age++; }
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
  
  exports.Vicinity = Vicinity;
  
})(this);
