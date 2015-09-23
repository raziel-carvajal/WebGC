/**
* @module src/algorithms
* @author Raziel Carvajal [raziel.carvajal-gomez@inria.fr] */
module.exports = Cyclon
var inherits = require('inherits')
var GossipProtocol = require('../superObjs/GossipProtocol')
var ViewSelector = require('../superObjs/ViewSelector')
inherits(Cyclon, GossipProtocol)
/**
* @class Cyclon
* @extends GossipProtocol See [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* @description Implementation of the gossip-based protocol
* [Cyclon]{@link http://gossple2.irisa.fr/~akermarr/cyclon.jnsm.pdf}. The protocol feeds
* the local peer with a random sample of peers from the P2P overlay.
* @param algOpts Settings of the protocol
* @param debug Log the behavior of the protocol
* @param gossipUtil Common functions used by the protocols, see
* [GossilUtil]{@link module:src/utils#GossipUtil}
* @param isLogActivated Boolean to decide weather to send or not statistics about the protocol to
* the main thread
* @param profile Local peer's profile*/
function Cyclon (algOpts, debug, gossipUtil, isLogActivated, profile) {
  if (!(this instanceof Cyclon)) return Cyclon(algOpts, debug, gossipUtil, isLogActivated, profile)
  this.isLogActivated = isLogActivated
  GossipProtocol.call(this, algOpts, debug, gossipUtil, profile)
  this.debug('Cyclon.init')
}
/**
* @memberof Cyclon
* @const defaultOpts
* @description Default values for the gossip attributes. During its instantiation, via the 
* [GossipFactory]{@link module:src/services/GossipFactory} object, if the user doesn't specify
* any attribute the algorithm will be initialized with the values in this object.
* @default */
Cyclon.defaultOpts = {
  class: 'Cyclon',
  viewSize: 10,
  fanout: 5,
  periodTimeOut: 10000,
  propagationPolicy: { push: true, pull: true }
}
/**
* @memberof Cyclon
* @method selectPeer
* @description For more details, look for this method at the 
* [GossipProtocol]{@link module:src/superObjs#GossipProtocol} class.*/
Cyclon.prototype.selectPeer = function () { return this.gossipUtil.getOldestKey(this.view) }
/**
* @memberof Cyclon
* @method setMediator
* @description Sets an instance of the [GossipMediator]{@link module:src/controllers/GossipMediator}
* object to comunicate the main thread with the gossip protocol.*/
Cyclon.prototype.setMediator = function (mediator) { this.gossipMediator = mediator }
/**
* @memberof Cyclon
* @method initialize
* @description For more details, look for this method at the
* [GossipProtocol]{@link module:src/superObjs#GossipProtocol} class.*/
Cyclon.prototype.initialize = function (keys) {
  if (keys.length > 0) {
    var i = 0
    while (i < this.viewSize && i < keys.length) {
      this.view[keys[i]] = this.gossipUtil.newItem(0, 'undefined')
      i++
    }
  }
}
/**
* @memberof Cyclon
* @method selectItemsToSend
* @description "This.fanout" items are chosen in a randomly way from the local peer's view.
* For more details, look for this method at the
* [GossipProtocol]{@link module:src/superObjs#GossipProtocol} class.
* @param receiver The selection of items will be sent to this peer
* @param gossMsgType Strting to define the type of gossip exchange, there are two possible values:
* i) GOSSIP-PUSH means to send items to an external peer or ii) GOSSIP-PULL to keep items from an
* external peer.*/
Cyclon.prototype.selectItemsToSend = function (receiver, gossMsgType) {
  var dstPeer = receiver || this.selectPeer()
  if (!dstPeer) return
  if (receiver) debug(this.algoId + ': SelectItemsToSend, receiver is ' + receiver)
  else debug(this.algoId + ': SelectItemsToSend, receiver is ' + dstPeer + ' (oldest peer in view)')
  var clone = JSON.parse(JSON.stringify(this.view))
  delete clone[dstPeer]
  var subDict = this.gossipUtil.getRandomSubDict(this.fanout - 1, clone)
  subDict[this.peerId] = this.gossipUtil.newItem(0, this.profile.getPayload())
  var msg = {
    service: gossMsgType,
    header: 'outgoingMsg',
    emitter: this.peerId,
    receiver: dstPeer,
    payload: subDict,
    algoId: this.algoId
  }
  this.gossipMediator.postInMainThread(msg)
}
/**
* @memberof Cyclon
* @method selectItemsToKeep
* @description For more details, look for this method at the
* [GossipProtocol]{@link module:src/superObjs#GossipProtocol} class.
* @param msg Items from an external peer.*/
Cyclon.prototype.selectItemsToKeep = function (msg) {
  var rcvKeys = Object.keys(msg.payload)
  if (rcvKeys.length === 0) return
  var i = 0
  var currentKeys = Object.keys(this.view)
  if (currentKeys.length === 0) {
    do {
      this.view[ rcvKeys[i] ] = msg.payload[ rcvKeys[i] ]
      i++
    } while (i < rcvKeys.length && Object.keys(this.view).length < this.viewSize)
  } else {
    var newCache = {}
    if (rcvKeys.indexOf(this.peerId, 0) !== -1) {
      delete msg.payload[this.peerId]
      rcvKeys = Object.keys(msg.payload)
    }
    var props, j
    do {
      if (currentKeys.indexOf(rcvKeys[i], 0) === -1) newCache[ rcvKeys[i] ] = msg.payload[ rcvKeys[i] ]
      else {
        if (msg.payload[ rcvKeys[i] ].age < this.view[ rcvKeys[i] ].age) {
          props = Object.keys(msg.payload[ rcvKeys[i] ])
          for (j = 0; j < props.length; j++) 
            this.view[ rcvKeys[i] ][ props[j] ] = msg.payload[ rcvKeys[i] ][ props[j] ]
        }
      }
      i++
    } while (i < rcvKeys.length && Object.keys(newCache).length < this.viewSize)
    i = 0
    while (Object.keys(newCache).length < this.viewSize && i < currentKeys.length) {
      newCache[ currentKeys[i] ] = this.view[ currentKeys[i] ]
      i += 1
    }
    this.view = newCache
  }
}
/**
* @memberof Cyclon
* @method increaseAge
* @description For more details, look for this method at the
* [GossipProtocol]{@link module:src/superObjs#GossipProtocol} class.*/
Cyclon.prototype.increaseAge = function () {
  var keys = Object.keys(this.view)
  for (var i = 0; i < keys.length; i++) this.view[keys[i]].age++
}
