/** 
* @module lib/algorithms */
(function(exports){
  /**
  * @class Vicinity
  * @classdesc This class implements the gosip-based algoritm Vicinity. The local view 
  * is basically a set of ID's, each ID identifies a remote peer.The implementation of 
  * the view GossipProtocol.view is a dictionary where the ID of a remote peer is a key and 
  * each key points to an {@link Item} which contains an age field (timestamp) and a 
  * data field (application dependent).
  * @param {Object} options - Configuration of the gossip-based protocol.
  * @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr> */
  function Vicinity(options){
    GossipProtocol.call(this, options);
    this.selectionPolicy = options.selectionPolicy;
    this.proximityFunc = this.instantiateSimFunc(options.similarityFunction);
  }
  /**
  * @desc This object represents the configuration by default of this protocol. During the
  * instantiation of this object (via the Factory object) if the options are not defined
  * the default configuration will be taken into account. 
  * @property {Object} defaultOpts - Default configuration of this gossip-based protocol.
  * @default */
  Vicinity.defaultOpts = {
    viewSize: 10,
    gossipLength: 5,
    periodTime: 10000,
    propagationPolicy: { push: true, pull: true },
    selectionPolicy: 'biased', // random OR biased OR agr-biased
    similarityFunction: 'DumbProximityFunc',
    dependencies: [
      { localAtt: 'rpsView',
        externalObj: 'Cyclon',
        externalAtt: 'view' }
    ]
  };
  util.inherits(Vicinity, GossipProtocol);
  /**
  * @method instantiateSimFunc
  * @desc This method creates an instance of the similarity function that Vicinity uses for
  * the creation of clusters
  * @param {String} nameF - Class's name of the similarity function. */
  Vicinity.prototype.instantiateSimFunc = function(nameF){
    var func;
    try{
      if( typeof nameF !== 'string' )
        throw 'The name of the function must be a string';
      var constructor = exports[nameF];
      if( typeof constructor === 'undefined' )
        throw 'Similarity function does not exist in the library of the system';
      func = new constructor(this.data);
    }catch(e){
      console.log('Similarity function was not instantiaed\n\t' + e);
    }
    return func;
  };
  /** 
  * @method selectPeer
  * @desc See  method GossipProtocol.selectPeer() for more information. Particularly,
  * this method selects the remote peer's identifier with the oldest age.*/
  Vicinity.prototype.selectPeer = function(){
    return gossipUtil.getOldestKey(this.view);
  };
  /**
  * @method getItemsToSend
  * @desc See method GossipProtocol.getItemsToSend() for more information. Particularly,
  * the selection of items is performed following one of the next cases: i) if 
  * selection='random' items from GossipProtocol.view are chosen 
  * in a randomly way, ii) if selection='biased' the most similar 
  * GossipProtocol.gossipLength items are chosen from GossipProtocol.view
  * and iii) if selection='agr-biased' the most similar 
  * GossipProtocol.gossipLength items are chosen from the views Vicinity.rpsView and 
  * GossipProtocol.view */
  Vicinity.prototype.getItemsToSend = function(thisId, dstPeer, thread){
    var subDict = {}, itmsNum;
    switch( thread ){
      case 'active':
        delete this.view[dstPeer];
        itmsNum = this.gossipLength - 1;
      break;
      case 'passive':
        itmsNum = this.gossipLength;
      break;
      default:
        itmsNum = 0;
      break;
    }
    switch( this.selectionPolicy ){
      case 'random':
        subDict = gossipUtil.getRandomSubDict(itmsNum, this.view);
      break;
      case 'biased':
        subDict = this.proximityFunc._getClosestSubdic(itmsNum, this.view);
      break;
      case 'agr-biased':
        var mergedV = gossipUtil.mergeViews(this.view, this.rpsView);
        subDict = this.proximityFunc._getClosestSubdic(itmsNum, mergedV);
      break;
      default:
        console.log('Unknown peer selection policy');
      break;
    }
    if( thread === 'active' )
      subDict[thisId] = gossipUtil.newItem(0, this.proximityFunc.proxVal);
    return subDict;
  };
  /**
  * @method selectItemsToKeep
  * @desc See method GossipProtocol.selectItemsToKeep() for more information. */
  Vicinity.prototype.selectItemsToKeep = function(thisId, rcvCache){
    var tmp = gossipUtil.mergeViews(this.view, rcvCache);
    var mergedViews = gossipUtil.mergeViews(tmp, this.rpsView);
    if( thisId in mergedViews )
      delete mergedViews[thisId];
    this.view = this.proximityFunc._getClosestSubdic(this.viewSize, mergedViews);
  };
  /** 
  * @method initialize
  * @desc See method GossipProtocol.initialize() for more information. */
  Vicinity.prototype.initialize = function(keys){
    if( keys.length > 0 ){
      for( var i in keys )
        this.view[ keys[i] ] = gossipUtil.newItem(0, '?');
    }
  };
  /** 
  * @method increaseAge
  * @desc See method GossipProtocol.increaseAge() for more information. */
  Vicinity.prototype.increaseAge = function(){
    var keys = Object.keys(this.view);
    for( var i = 0; i < keys.length; i++ )
      this.view[ keys[i] ].age += 1;
  };
  /**
  * @method getSimilarPeerIds
  * This method gives n peer identifiers from GossipProtocol.view
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
      for( var i = 0; i < n; i += 1 )
        result.push( iDs[i] );
      return result;
    }
  };
  /** 
  * @method getLog
  * @desc See method GossipProtocol.getLog() for more information. */
  Vicinity.prototype.getLog = function(){
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
