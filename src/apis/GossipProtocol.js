/** 
* @module src/apis*/
(function(exports){
  /** 
  * @class GossipProtocol
  * @description This "abstract" class represents a gossip-based protocol. Every class with the
  * implementation of a gossip protocol must inherit from this class, additionally, every method
  * on this class must be overwritten otherwise an exception will be reached.
  * @param opts {Object} - attributes of the object
  * @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr>
  */ 
  function GossipProtocol(opts){
    this.class = opts.class;
    //attributes in common for each protocol
    this.view = {};
    this.loop = 0;
    this.data = opts.data;
    this.viewSize = opts.viewSize;
    this.fanout = opts.fanout;
    this.periodTimeOut = opts.periodTimeOut;
    this.propagationPolicy = opts.propagationPolicy;
    this.protoId = opts.protoId;//unique ID for the algorithm
    this.coordinator = opts.coordinator;//reference to a Coordinator
    var idForLogging = opts.class + '_' + opts.protoId;
    this.log = new Logger(opts.loggingServer, opts.peerId, idForLogging);
    this.gossipUtil = new GossipUtil({
      loggingServer: opts.loggingServer,
      peerId: opts.peerId,
      objName: idForLogging });
    //error and warning messages
    this.nonImpMsg = 'An implementation for this method is required';
  }
  /** 
  * @description The age field of each item in the view GossipProtocol.view increments by one
  * @method increaseAge */
  GossipProtocol.prototype.increaseAge = function(){ throw this.nonImpMsg; };
  /** 
  * @description This method obtains a string representation of view GossipProtocol.view Basically, the 
  * string is a set of tuples where each tuple has two entries, the first entry is an ID of a remote 
  * peer and the second entry is its timestamp. 
  * @method getLog
  * @returns {String} - String representation of the view.*/
  GossipProtocol.prototype.getLog = function(){ throw this.nonImpMsg; };
  /** 
  * @description This method selects one remote peer identifier in GossipProtocol.view
  * @method selectPeer
  * @returns String - ID of the remote peer.*/
  GossipProtocol.prototype.selectPeer = function(){ throw this.nonImpMsg; };
  /**
  * @description This method selects a subset of GossipProtocol.gossipLength identifiers from GossipProtocol.view
  * @method selectItemsToSend
  * @param thisIs:String - The ID of the local peer.
  * @param dstPeer:String - The ID of the remote peer.
  * @param thread:String - Whether the selection is performed in the passive thread or in the active thread.
  * @returns Object - Subset of the local view.*/
  GossipProtocol.prototype.selectItemsToSend = function(thisId, dstPeer, thread){ throw this.nonImpMsg; };
  /**
  * @description This method merges the received set of items rcvCache with those in GossipProtocol.view 
  * the size of the view is kept less than or equal to GossipProtocol.viewSize
  * @method selectItemsToKeep
  * @param thisId:String - The ID of the local peer.
  * @param rcvCache:String - The set of items to merge. */
  GossipProtocol.prototype.selectItemsToKeep = function(thisId, rcvCache){ throw this.nonImpMsg; };
  /** 
  * @description This method initialize GossipProtocol.view with the peer identifiers n the array keys.
  * @method initialize
  * @param keys:Array - Array of peer identifiers. */
  GossipProtocol.prototype.initialize = function(keys){ throw this.nonImpMsg; };
  /**
  * @description Strictly talking this method doesn't belong to a gossip-based class but it is used
  * for geting data about the neighbours of each peer and to send them to a PeerJS plotter
  * @method getPlotInfo
  * @param peerId:String - Identifier of the local peer*/
  GossipProtocol.prototype.getPlotInfo = function(peerId){ throw this.nonImpMsg; };
  
  exports.GossipProtocol = GossipProtocol;
})(this);
