/**
* @module src/superObjs*/
module.exports = GossipProtocol
/**
* @class GossipProtocol
* @description Representation of a generic gossip-based protocol, any other implementation must inherits
* from this class. This is a description the class's attributes: i) view: object to represent the negihbors
* of the local peer, object's keys are the unique peer identifiers while its values are vectors with
* two entries, the first one is the age of the entry (integer) and the second one is the neighbor's
* profile (another object), ii) viewSize: size of the local peer's neighborhood, iii) loop: number of
* the current gossip cycle, iv) gossipPeriod: every gossip cycle will ocurr in this number of seconds,
* v) fanout: number of entries in the peer's view that will be exchange on every gossip cycle,
* vi) peerId: string which identifies the local peer in an unique way, vii) algoId: string to identify
* one instance of a gossip algorithm in an unique, viii) propagationPolicy: object to determine wheather
* the algorithm push and/or pull data. Every method on this class must be overwritten otherwise an
* exception will be reached.
* 
* NOTE: since its version 0.4.1, WebGC uses web workers. The heritage of one gossip implementation just
* takes into account the attributes in this class and the overwriting of methods is not taken into
* consideration in the context of web workers.
* FIXME To allow the overwriting of methods with web workers.
* @param opts object with the attributes of the gossip algorithm
* @param debug object to log the protocol's behavior
* @param gossipUtil gossip utilites, see [gossip utilities]{@link module:src/utils#GossipUtil}
* @param profile local peer's profile
* @author Raziel Carvajal-Gomez <raziel.carvajal@gmail.com> */
function GossipProtocol (opts, debug, gossipUtil, profile) {
  this.view = {}
  this.loop = 0
  this.class = opts.class
  this.viewSize = opts.viewSize
  this.fanout = opts.fanout
  this.gossipPeriod = opts.gossipPeriod
  this.propagationPolicy = opts.propagationPolicy
  this.algoId = opts.algoId// unique ID for the algorithm
  this.debug = debug
  this.peerId = opts.peerId
  this.debug = debug
  this.gossipUtil = gossipUtil
  this.profile = profile 
  this.nonImpMsg = 'An implementation for this method is required'
  this.debug('GossipProtocol.init')
}
/**
* @memberof GossipProtocol
* @method increaseAge
* @description Increments by one the age of each view's item.
* @deprecated see note on the top of this file*/
GossipProtocol.prototype.increaseAge = function () { throw new Error(this.nonImpMsg) }

/**
* @description This method selects one neighbor from the view. The selection depends on
* gossip imeplementation.
* @memberof GossipProtocol
* @method selectPeer
* @returns String Neighbor's peer identifier
* @deprecated see note on the top of this file*/
GossipProtocol.prototype.selectPeer = function () { throw new Error(this.nonImpMsg) }

/**
* @memberof GossipProtocol
* @method selectItemsToSend
* @description Selects a subset from the view. The selection depends on the gossip
* imeplemetation.
* @param receiver The gossip exchange will be perform with this neighbor
* @param gossMsgType Whether it pulls or push the message
* @deprecated See NOTE on the top of this file*/
GossipProtocol.prototype.selectItemsToSend = function (receiver, gossMsgType) { throw new Error(this.nonImpMsg) }

/**
* @memberof GossipProtocol
* @method selectItemsToKeep
* @description This method merges the items in msg with those from the peer's view, the final number
* of items will not exced the viewSize attribute.
* @param msg Items received from one neighbor
* @deprecated See NOTE on the top of this file*/
GossipProtocol.prototype.selectItemsToKeep = function (msg) { throw new Error(this.nonImpMsg) }
