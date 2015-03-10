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
    this.selector = new ViewSelector(this.data[this.algoId], log, algOpts.similarityFunction);
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
        this.view[ keys[i].id ] = this.gossipUtil.newItem(0, keys[i].profile[this.algoId]);
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
          header: 'outgoingMsg',
          emitter: this.peerId,
          receiver: dstPeer,
          payload: subDict,
          algoId: this.algoId
        };
        this.gossipMediator.postInMainThread(msg);
        this.gossipMediator.sentActiveCycleStats();
        break;
      case 'biased':
        subDict = this.selector.getClosestNeighbours(itmsNum, clone, {k: this.peerId, v: newItem});
        if(newItem !== null)
          subDict[this.peerId] = newItem;
        msg = {
          header: 'outgoingMsg',
          emitter: this.peerId,
          receiver: dstPeer,
          payload: subDict,
          algoId: this.algoId
        };
        this.gossipMediator.postInMainThread(msg);
        this.gossipMediator.sentActiveCycleStats();
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
    var keys = Object.keys(msg.result), result = {}, itm;
    for(var i = 0; i < keys.length; i++){
      itm = msg.result[ keys[i] ];
      result[ keys[i] ] = this.gossipUtil.newItem(itm.age, itm.data[this.algoId]);
    }
    var mergedViews = this.gossipUtil.mergeViews(msg.cluView, result);
    var similarNeig = this.selector.getClosestNeighbours(msg.n, mergedViews, {k: this.peerId, v: msg.newItem});
    var payload = {
      header: 'outgoingMsg',
      emitter: this.peerId,
      receiver: msg.receiver,
      'payload': similarNeig,
      algoId: this.algoId
    };
    this.gossipMediator.postInMainThread(payload);
    this.gossipMediator.sentActiveCycleStats();
  };
  /**
  * @method selectItemsToKeep
  * @description See method GossipProtocol.selectItemsToKeep() for more information. */
  Vicinity.prototype.selectItemsToKeep = function(msg){
    var mergedViews = this.gossipUtil.mergeViews(this.view, msg.payload);
    this.log.info('View after merge1: ' + JSON.stringify(mergedViews));
    var msg1 = {
      header: 'getDep',
      cluView: mergedViews,
      emitter: this.algoId,
      callback: 'doItemsToKeepWithDep',
      receptionTime: msg.receptionTime
    };
    for(var i = 0; i < this.dependencies.length; i++){
      msg1.depId = this.dependencies[i].algoId;
      msg1.depAtt = this.dependencies[i].algoAttribute;
      this.gossipMediator.applyDependency(msg1);
    }
  };
  /***/
  Vicinity.prototype.doItemsToKeepWithDep = function(msg){
    var keys = Object.keys(msg.result), result = {}, i, itm;
    for(i = 0; i < keys.length; i++){
      itm =  msg.result[ keys[i] ];
      result[ keys[i] ] = this.gossipUtil.newItem(itm.age, itm.data[this.algoId]);
    }
    this.log.info('rps view: ' + JSON.stringify(result));
    var mergedViews = this.gossipUtil.mergeViews(msg.cluView, result);
    this.log.info('merge of views merge1 and rps: ' + JSON.stringify(mergedViews));
    if(this.peerId in mergedViews){ delete mergedViews[this.peerId]; }
    var similarNeig = this.selector.getClosestNeighbours(this.viewSize, mergedViews, null);
    keys = Object.keys(this.view);
    for(i = 0; i < keys.length; i++){ delete this.view[ keys[i] ]; }
    keys = Object.keys(similarNeig);
    for(i = 0; i < keys.length; i++){ this.view[ keys[i] ] = similarNeig[ keys[i] ]; }
    this.log.info('View after update: ' + JSON.stringify(this.view));
    //Logging information of view update
    var viewUpdOffset = new Date() - msg.receptionTime;
    var msgToSend = {
      trace: {
        algoId: this.algoId,
        loop: this.loop,
        view: JSON.stringify(this.view),
        'viewUpdOffset': viewUpdOffset
      }
    };
    if(!this.log.isActivated){
      this.gossipMediator.viewUpdsLogCounter++;
      msgToSend.header = 'viewUpdsLog';
      msgToSend.counter = this.gossipMediator.viewUpdsLogCounter;
      this.gossipMediator.postInMainThread(msgToSend);
    }else
      this.log.info(JSON.stringify(msgToSend));
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
    if( n <= 0){ return []; }
    var iDs = Object.keys(this.view);
    if( n >= iDs.length ){ return iDs; }
    else{
      var result = [];
      for(var i = 0; i < n; i++)
        result.push( iDs[i] );
      return result;
    }
  };
  
  exports.Vicinity = Vicinity;
  
})(this);
