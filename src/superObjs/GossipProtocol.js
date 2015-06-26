/**
* @module src/superObjs*/
module.exports = GossipProtocol

/**
* @class GossipProtocol
* @description Representation of one generic gossip protocol, every implementation must inherits
* from this class, additionally every method
* on this class must be overwritten otherwise an exception will be reached.
* NOTE: WebGC in its version 0.4.1 uses web workers, the heritage of one gossip implementation just
* takes into account the attributes in this class and the overwriting of methods is not taken into
* consideration in the context of web workers.
* FIXME To allow the overwriting of methods with web workers.
* @param opts Object with the settings of one gossip protocol
* @param log Logger (see [LoggerForWebWorker]{@link module:src/utils#LoggerForWebWorker}) to monitor
* the actions of one gossip protocol
* @param gossipUtil Object with [gossip utilities]{@link module:src/utils#GossipUtil}
* @author Raziel Carvajal-Gomez <raziel.carvajal@gmail.com> */
function GossipProtocol (opts, log, gossipUtil) {
  this.class = opts.class
  // attributes in common for each protocol
  this.view = {}
  this.loop = 0
  this.data = opts.data
  this.viewSize = opts.viewSize
  this.fanout = opts.fanout
  this.gossipPeriod = opts.gossipPeriod
  this.propagationPolicy = opts.propagationPolicy
  this.algoId = opts.algoId// unique ID for the algorithm
  this.log = log
  this.gossipUtil = gossipUtil
  this.peerId = opts.peerId
  // error and warning messages
  this.nonImpMsg = 'An implementation for this method is required'
}

/**
* @memberof GossipProtocol
* @method increaseAge
* @description Increments by one the age field of each item in the view GossipProtocol.view.
* @deprecated For version 0.4.1, see the NOTE at the top of this file*/
GossipProtocol.prototype.increaseAge = function () { throw this.nonImpMsg }

/**
* @description This method selects one remote peer identifier in GossipProtocol.view
* @memberof GossipProtocol@method selectPeer
* @returns String - ID of the remote peer.*/
GossipProtocol.prototype.selectPeer = function () { throw this.nonImpMsg }

/**
* @memberof GossipProtocol
* @method selectItemsToSend
* @description This method selects a subset of GossipProtocol.gossipLength identifiers from GossipProtocol.view
* @param thisIs:String - The ID of the local peer.
* @param dstPeer:String - The ID of the remote peer.
* @param thread:String - Whether the selection is performed in the passive thread or in the active thread.
* @returns Object - Subset of the local view.
* @deprecated For version 0.4.1, see the NOTE at the top of this file*/
GossipProtocol.prototype.selectItemsToSend = function (thread) { throw this.nonImpMsg }

/**
* @memberof GossipProtocol
* @method selectItemsToKeep
* @description This method merges the received set of items rcvCache with those in GossipProtocol.view
* the size of the view is kept less than or equal to GossipProtocol.viewSize
* @param thisId:String - The ID of the local peer.
* @param rcvCache:String - The set of items to merge.
* @deprecated For version 0.4.1, see the NOTE at the top of this file*/
GossipProtocol.prototype.selectItemsToKeep = function (thisId, rcvCache) { throw this.nonImpMsg }

/**
* @memberof GossipProtocol
* @method getPlotInfo
* @description Strictly talking this method doesn't belong to a gossip-based class but it is used
* for getting data about the neighbours of each peer and to send them to a PeerJS plotter
* @param peerId:String - Identifier of the local peer
* @deprecated For version 0.4.1, see the NOTE at the top of this file*/
GossipProtocol.prototype.getPlotInfo = function (peerId) { throw this.nonImpMsg }
