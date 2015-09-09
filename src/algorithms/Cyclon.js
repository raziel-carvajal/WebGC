/**
* @module src/algorithms*/
module.exports = Cyclon

var inherits = require('inherits')
var GossipProtocol = require('../superObjs/GossipProtocol')
var ViewSelector = require('../superObjs/ViewSelector')
inherits(Cyclon, GossipProtocol)

/**
* @class Cyclon
* @extends GossipProtocol See [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* @description Implementation of the gossip-based protocol
* [Cyclon]{@link http://gossple2.irisa.fr/~akermarr/cyclon.jnsm.pdf}. The local view is an
* object where each of its keys identify a remote peer (peer ID); the value of each key points
* to a vector with two entries, the first one is an integer (age of the vector) and the
* second one is the data owned by the remote peer.
* @param algOpts Object with the settings of the protocol (fanout, view size, etc.)
* @param log [Logger]{@link module:src/utils#Logger} object register any error, warning or info
* message
* @param gossipUtil [GossipUtil]{@link module:src/utils#GossipUtil} object that contains common
* functions used by gossip protocols
* @author Raziel Carvajal [raziel.carvajal-gomez@inria.fr] */
function Cyclon (algOpts, debug, gossipUtil, isLogActivated, profile) {
  if (!(this instanceof Cyclon)) return Cyclon(algOpts, debug, gossipUtil, isLogActivated, profile)
  this.isLogActivated = isLogActivated
  GossipProtocol.call(this, algOpts, debug, gossipUtil, profile)
  this.debug('Cyclon.init')
}
/**
* @memberof Cyclon
* @const defaultOpts
* @description Default configuration of this protocol. During the instantiation of a Cyclon object
* (via the Factory object) if the user doesn't specify any option this object is taken into account.
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
* @description Look for this method at [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* for more details.*/
Cyclon.prototype.selectPeer = function () { return this.gossipUtil.getOldestKey(this.view) }

/**
* @memberof Cyclon
* @method setMediator
* @description Look for this method at [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* for more details.*/
Cyclon.prototype.setMediator = function (mediator) { this.gossipMediator = mediator }

/**
* @memberof Cyclon
* @method initialize
* @description Look for this method at [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* for more details.*/
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
* @description Look for this method at [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* for more details.*/
Cyclon.prototype.selectItemsToSend = function (thread) {
  var dstPeer = this.selectPeer()
  var subDict = {}
  var clone = JSON.parse(JSON.stringify(this.view))
  switch (thread) {
    case 'active':
      delete clone[dstPeer]
      subDict = this.gossipUtil.getRandomSubDict(this.fanout - 1, clone)
      debug('Current profile: ' + this.profile.getPayload())
      subDict[this.peerId] = this.gossipUtil.newItem(0, this.profile.getPayload())
      break
    case 'passive':
      subDict = this.gossipUtil.getRandomSubDict(this.fanout, this.clone)
      break
    default:
      this.debug('Unknown selection policy')
      break
  }
  if (dstPeer) {
    var msg = {
      service: 'GOSSIP',
      header: 'outgoingMsg',
      emitter: this.peerId,
      receiver: dstPeer,
      payload: subDict,
      algoId: this.algoId
    }
    this.gossipMediator.postInMainThread(msg)
  }
  this.gossipMediator.sentActiveCycleStats()
}

/**
* @memberof Cyclon
* @method selectItemsToKeep
* @description Look for this method at [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* for more details.*/
Cyclon.prototype.selectItemsToKeep = function (msg) {
  var rcvKeys = Object.keys(msg.payload)
  if (rcvKeys.length === 0) return
  var i
  var currentKeys = Object.keys(this.view)
  if (currentKeys.length === 0) {
    i = 0
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
    i = 0
    do {
      if (currentKeys.indexOf(rcvKeys[i], 0) === -1) newCache[ rcvKeys[i] ] = msg.payload[ rcvKeys[i] ]
      else {
        if (msg.payload[ rcvKeys[i] ].age < this.view[ rcvKeys[i] ].age) {
          this.view[ rcvKeys[i] ].age = msg.payload[ rcvKeys[i] ].age
          this.view[ rcvKeys[i] ].data = msg.payload[ rcvKeys[i] ].data
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
    // Logging information of view update
    var viewUpdOffset = new Date() - msg.receptionTime
    var msgToSend = {
      service: 'GOSSIP',
      trace: {
        algoId: this.algoId,
        loop: this.loop,
        view: JSON.stringify(this.view),
        'viewUpdOffset': viewUpdOffset
      }
    }
    if (!this.isLogActivated) {
      this.gossipMediator.viewUpdsLogCounter++
      msgToSend.header = 'viewUpdsLog'
      msgToSend.counter = this.gossipMediator.viewUpdsLogCounter
      this.gossipMediator.postInMainThread(msgToSend)
    }
  }
}

/**
* @memberof Cyclon
* @method increaseAge
* @description Look for this method at [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* for more details.*/
Cyclon.prototype.increaseAge = function () {
  var keys = Object.keys(this.view)
  for (var i = 0; i < keys.length; i++) this.view[keys[i]].age++
}
