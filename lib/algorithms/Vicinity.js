(function(exports){
  /**
  * @class Vicinity
  * @classdesc This class implements the gosip-based algoritm Vicinity. The local view 
  * is basically a set of ID's, each ID identifies a remote peer.The implementation of 
  * {@link GossipProtocol.view} is a dictionary where the ID of a remote peer is a key and 
  * each key points to an {@link Item} which contains an age field (timestamp) and a 
  * data field (application dependent).
  * @param {Integer} viewSize - Size of the local view.
  * @param {Integer} gossipLength - Number of items of a Cyclon message.
  * @param {Integer} simVal - Preference of the local peer.
  * @param {Dictionary} rpsView - View of the Random Peer Sampling instance. */
  function Vicinity(options){
    this.prototype = Object.create( new GossipProtocol(options) );
    this.selectionPolicy = options.selectionPolicy;
    this.proximityFunc = this.instantiateSimFunc(options.similarityFunction);
    this.rpsView = {};
  }
  Vicinity.defaultOpts = {
    data: '?',
    viewSize: 10,
    gossipLenght: 5,
    periodTime: 10000,
    propagationPolicy: { push: true, pull: true },
    selectionPolicy: 'biased', // random OR biased OR agr-biased
    similarityFunction: 'DumbProximityFunc'
  };
  Vicinity.prototype.instantiateSimFun = function(nameF){
    var func;
    try{
      if( typeof nameF !== 'string' )
        throw 'The name of the function must be a string';
      var constructor = exports[nameF];
      if( typeof constructor === 'undefined' )
        throw 'Similarity function does not exist in the library of the system';
      func = constructor(this.data);
    }catch(e){
      console.log('Similarity function was not instantiaed\n\t' + e);
    }
    return func;
  };
  /** 
  * This method selects the remote peer's ID with the oldest age in 
  * {@link GossipProtocol.view}.
  * @method selectPeer
  * @returns {String} - Peer ID with the oldest age.*/
  Vicinity.prototype.selectPeer = function(){
    return gossipUtil.getOldestKey(this.view);
  };
  /**
  * This method gets a subset of size {@link GossipProtocol.gossipLength} from
  * {@link GossipProtocol.view} according to the selection policy {@link selection}. The
  * selection of items is performed following one of the next cases: i) if 
  * {@link selection}='random' items from {@link GossipProtocol.view} are chosen in a randomly 
  * way, ii) if {@link selection}='biased' the most similar {@link GossipProtocol.gossipLength}
  * items are chosen from {@link GossipProtocol.view} and iii) if {@link selection}='agr-biased'
  * the most similar {@link GossipProtocol.gossipLength} items are chosen from the views 
  * {@link Vicinity.rpsView} and {@link GossipProtocol.view} .
  * @method getItemsToSend
  * @param {String} thisId - The ID of the local peer.
  * @param {String} dstPeer - The ID of the remote peer.
  * @param {String} selection - Selection policy among the views.
  * @param {String} thread - Whether the selection is performed in passive or active mode.
  * @returns {Dictionary} - Subset of the local view(s).*/
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
  * This method merges the received set of items {@link rcvCache} with those in
  * {@link GossipProtocol.view} keeping at most {@link GossipProtocol.viewSize} items in the view.
  * @method selectItemsToKeep
  * @param {String} thisId - The ID of the local peer.
  * @param {String} rcvCache - The set of items to merge. */
  Vicinity.prototype.selectItemsToKeep = function(thisId, rcvCache){
    var tmp = gossipUtil.mergeViews(this.view, rcvCache);
    var mergedViews = gossipUtil.mergeViews(tmp, this.rpsView);
    if( thisId in mergedViews )
      delete mergedViews[thisId];
    this.view = this.proximityFunc._getClosestSubdic(this.viewSize, mergedViews);
  };
  /** 
  * This method initilize {@link GossipProtocol.view} with the peer IDs stored in {@link keys}.
  * @method initialize
  * @param {Array} keys - Array of peer IDs. */
  Vicinity.prototype.initialize = function(keys){
    if( keys.length > 0 ){
      for( var i in keys )
        this.view[ keys[i] ] = gossipUtil.newItem(0, '?');
    }
  };
  /** 
  * This method increments the age of each item in {@link GossipProtocol.view}.
  * @method increaseAge */
  Vicinity.prototype.increaseAge = function(){
    var keys = Object.keys(this.view);
    for( var i = 0; i < keys.length; i++ )
      this.view[ keys[i] ].age += 1;
  };
  /**
  * This method gives {@link n} peer identifiers from {@link GossipProtocol.view}. These peers 
  * have the higher degree of similarity with the local peer.
  * @method getSimilarPeerIds
  * @param {Integer} n - Number of the required peer IDs.
  * @returns {Array} Array of {@link n} peer IDs. */ 
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
  * This method obtains a string representation of {@link GossipProtocol.view}. Basically, the 
  * string is a set of tuples where each tuple has two entries, the first entry is an peer 
  * ID and the second one is its timestamp. 
  * @method getLog
  * @returns {String} - String representation of {@link GossipProtocol.view}.*/
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
