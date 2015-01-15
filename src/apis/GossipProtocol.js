/** 
* @module lib/apis */
(function(exports){
  /** 
  * @class GossipProtocol
  * @classdesc This "abstract" class represents a gossip-based protocol. The concret implementation
  * of every protocol must inherit from this class, additionally, every concret object must overwrite 
  * all the methods in this class; otherwise an exception will be reached.
  * @param {Object} opts - Configuration of the gossip-based protocol.
  * @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr>
  */ 
  function GossipProtocol(opts){
    this.class = opts.class;
    this.view = {};
    this.loop = 0;
    this.data = opts.data;
    this.viewSize = opts.viewSize;
    this.fanout = opts.fanout;
    this.periodTimeOut = opts.periodTimeOut;
    this.propagationPolicy = opts.propagationPolicy;
    // This attribute is a unique ID for the algorithm
    this.protoId = opts.protoId;
    // msgs
    this.nonImpMsg = 'An implementation for this method is required';
  }
  /** 
  * @desc This method increments the age of each item in the view GossipProtocol.view
  * @method increaseAge */
  GossipProtocol.prototype.increaseAge = function(){ throw this.nonImpMsg; };
  /** 
  * @desc This method obtains a string representation of view GossipProtocol.view Basically, the 
  * string is a set of tuples where each tuple has two entries, the first entry is an ID of a remote 
  * peer and the second entry is its timestamp. 
  * @method getLog
  * @returns {String} - String representation of the view.*/
  GossipProtocol.prototype.getLog = function(){ throw this.nonImpMsg; };
  /** 
  * @desc This method selects one remote peer identifier in GossipProtocol.view
  * @method selectPeer
  * @returns {String} - ID of the remote peer.*/
  GossipProtocol.prototype.selectPeer = function(){ throw this.nonImpMsg; };
  /**
  * @desc This method selects a subset of GossipProtocol.gossipLength identifiers from GossipProtocol.view
  * @method getItemsToSend
  * @param {String} thisId - The ID of the local peer.
  * @param {String} dstPeer - The ID of the remote peer.
  * @param {String} thread - Whether the selection is performed in the passive thread or in the active thread.
  * @returns {Object} - Subset of the local view.*/
  GossipProtocol.prototype.getItemsToSend = function(thisId, dstPeer, thread){ throw this.nonImpMsg; };
  /**
  * @desc This method merges the received set of items rcvCache with those in GossipProtocol.view The size 
  * of the view is kept less than or equal to GossipProtocol.viewSize
  * @method selectItemsToKeep
  * @param {String} thisId - The ID of the local peer.
  * @param {String} rcvCache - The set of items to merge. */
  GossipProtocol.prototype.selectItemsToKeep = function(thisId, rcvCache){ throw this.nonImpMsg; };
  /** 
  * @desc This method initialize GossipProtocol.view with the peer identifiers n the array keys.
  * @method initialize
  * @param {Array} keys - Array of peer identifiers. */
  GossipProtocol.prototype.initialize = function(keys){ throw this.nonImpMsg; };
  /**
  * @desc Strictly talking this method doesn't belong to a gossip-based class but it is used
  * for geting data about the neighbours of each peer and to send them to a PeerJS plotter
  * @method getPlotInfo
  * @param {String} - Identifier of the local peer
  */
  GossipProtocol.prototype.getPlotInfo = function(peerId){ throw this.nonImpMsg; };
  
  exports.GossipProtocol = GossipProtocol;
})(this);
