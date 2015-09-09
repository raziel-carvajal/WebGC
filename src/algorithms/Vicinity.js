/**
* @module src/algorithms */

module.exports = Vicinity

var inherits = require('inherits')
var GossipProtocol = require('../superObjs/GossipProtocol')
var ViewSelector = require('../superObjs/ViewSelector')
inherits(Vicinity, GossipProtocol)

/**
* @class Vicinity
* @extends GossipProtocol See [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* @description Implementation of the gossip-based protocol
* [Vicinity]{@link http://www.few.vu.nl/~spyros/papers/Thesis-Voulgaris.pdf}. The local view is an
* object where each of its keys identify a remote peer (peer ID); the value of each key points
* to a vector with two entries, the first one is an integer (age of the vector) and the
* second one is the data owned by the remote peer.
* @param algOpts Object with the settings of the protocol (fanout, view size, etc.)
* @param log [Logger]{@link module:src/utils#Logger} object register any error, warning or info
* message
* @param gossipUtil [GossipUtil]{@link module:src/utils#GossipUtil} object that contains common
* functions used by gossip protocols
* @author Raziel Carvajal-Gomez raziel.carvajal@gmail.com */
function Vicinity (algOpts, debug, gossipUtil, isLogActivated, profile) {
  if (!(this instanceof Vicinity)) return Vicinity(algOpts, debug, gossipUtil, isLogActivated, profile)
  this.isLogActivated = isLogActivated
  GossipProtocol.call(this, algOpts, debug, gossipUtil)
  this.selectionPolicy = algOpts.selectionPolicy
  this.selector = new ViewSelector(this.profile.getPayload(), debug, algOpts.similarityFunction)
  this.dependencies = algOpts.dependencies
  debug('Vicinity.init')
}
/**
* @memberof Vicinity
* @const defaultOpts
* @description Default configuration of this protocol. During the instantiation of a Cyclon object
* (via the Factory object) if the user doesn't specify any option this object is taken into account.
* @default */
Vicinity.defaultOpts = {
  class: 'Vicinity',
  viewSize: 10,
  fanout: 5,
  periodTimeOut: 10000,
  propagationPolicy: {push: true, pull: true},
  selectionPolicy: 'biased' // random OR biased OR agr-biased
}

/**
* @memberof Vicinity
* @method selectPeer
* @description Look for this method at [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* for more details.*/
Vicinity.prototype.selectPeer = function () { return this.gossipUtil.getOldestKey(this.view) }

/**
* @memberof Vicinity
* @method setMediator
* @description Look for this method at [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* for more details.*/
Vicinity.prototype.setMediator = function (mediator) {
  mediator.setDependencies(this.dependencies)
  this.gossipMediator = mediator
}

/**
* @memberof Vicinity
* @method initialize
* @description Look for this method at [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* for more details.*/
Vicinity.prototype.initialize = function (keys) {
  if (keys.length > 0) {
    var i = 0
    while (i < this.viewSize && i < keys.length) {
      this.view[keys[i]] = this.gossipUtil.newItem(0, undefined)
      i++
    }
  }
}

/**
* @memberof Vicinity
* @method selectItemsToSend
* @description Look for this method at [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* for more details. Particularly, the selection of items is performed following one of the next
* cases: i) if selection='random' items from GossipProtocol.view are chosen in a randomly way,
* ii) if selection='biased' the most similar GossipProtocol.fanout items are chosen from
* GossipProtocol.view and iii) if selection='agr-biased' the most similar GossipProtocol.fanout
* items are chosen from the views Vicinity.rpsView and GossipProtocol.view ;see method
* GossipProtocol.selectItemsToSend() for more information.*/
Vicinity.prototype.selectItemsToSend = function (thread) {
  var dstPeer = this.selectPeer()
  var clone = JSON.parse(JSON.stringify(this.view))
  var itmsNum, msg, subDict
  switch (thread) {
    case 'active':
      delete clone[dstPeer]
      itmsNum = this.fanout - 1
    break
    case 'passive':
      itmsNum = this.fanout
    break
    default:
      itmsNum = 0
    break
  }
  var newItem = thread === 'active' ? this.gossipUtil.newItem(0, this.profile.getPayload()) : null
  switch (this.selectionPolicy) {
    case 'random':
      subDict = this.gossipUtil.getRandomSubDict(itmsNum, clone)
      if (newItem !== null) { subDict[this.peerId] = newItem }
      msg = { service: 'GOSSIP', header: 'outgoingMsg', emitter: this.peerId,
        receiver: dstPeer, payload: subDict, algoId: this.algoId }
      this.gossipMediator.postInMainThread(msg)
      this.gossipMediator.sentActiveCycleStats()
      break
    case 'biased':
      subDict = this.selector.getClosestNeighbours(itmsNum, clone, {k: this.peerId, v: newItem})
      if (newItem !== null) { subDict[this.peerId] = newItem }
      msg = { service: 'GOSSIP', header: 'outgoingMsg', emitter: this.peerId,
        receiver: dstPeer, payload: subDict, algoId: this.algoId }
      this.gossipMediator.postInMainThread(msg)
      this.gossipMediator.sentActiveCycleStats()
      break
    case 'agr-biased':
      msg = { header: 'getDep', cluView: clone, n: itmsNum,
        'newItem': newItem, receiver: dstPeer, emitter: this.algoId,
        callback: 'doAgrBiasedSelection' }
      for (var i = 0; i < this.dependencies.length; i++) {
        msg.depId = this.dependencies[i].algoId
        msg.depAtt = this.dependencies[i].algoAttribute
        this.gossipMediator.applyDependency(msg)
      }
      break
    default:
      this.debug('Unknown peer selection policy')
      break
  }
}

/**
* @memberof Vicinity
* @method doAgrBiasedSelection
* @description When this selection is performed, items from the RPS layer are mixed with the
* most similar ones (this items are obtained via the similarity function) in order to get
* the new view of Vicinity. Once the merged is finished, the result view is sent to the main
* thread (javascript main tread) for being send to another peer.
* @param msg This object contains a list of items from the RPS layer and the receiver of the
* merged view.*/
Vicinity.prototype.doAgrBiasedSelection = function (msg) {
  var keys = Object.keys(msg.result)
  var result = {}
  var itm
  for (var i = 0; i < keys.length; i++) {
    itm = msg.result[ keys[i] ]
    result[ keys[i] ] = this.gossipUtil.newItem(itm.age, itm.data)
  }
  var mergedViews = this.gossipUtil.mergeViews(msg.cluView, result)
  var similarNeig = this.selector.getClosestNeighbours(msg.n, mergedViews, {k: this.peerId, v: msg.newItem})
  var payload = {
    service: 'GOSSIP',
    header: 'outgoingMsg',
    emitter: this.peerId,
    receiver: msg.receiver,
    'payload': similarNeig,
    algoId: this.algoId
  }
  this.gossipMediator.postInMainThread(payload)
  this.gossipMediator.sentActiveCycleStats()
}

/**
* @memberof Vicinity
* @method selectItemsToKeep
* @description Look for this method at [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* for more details.*/
Vicinity.prototype.selectItemsToKeep = function (msg) {
  var mergedViews = this.gossipUtil.mergeViews(this.view, msg.payload)
  var msg1 = {
    header: 'getDep',
    cluView: mergedViews,
    emitter: this.algoId,
    callback: 'doItemsToKeepWithDep',
    receptionTime: msg.receptionTime
  }
  for (var i = 0; i < this.dependencies.length; i++) {
    msg1.depId = this.dependencies[i].algoId
    msg1.depAtt = this.dependencies[i].algoAttribute
    this.gossipMediator.applyDependency(msg1)
  }
}

/**
* @memberof Vicinity
* @method doItemsToKeepWithDep
* @description When this selection is performed, items from the RPS layer are mixed with the
* most similar ones (this items are obtained via the similarity function) in order to get
* the new view of Vicinity. Once the merged is finished, the view Vicinity.view is updated with
* the merged view.
* @param msg This object contains a list of items from the RPS layer */
Vicinity.prototype.doItemsToKeepWithDep = function (msg) {
  var keys = Object.keys(msg.result)
  var result = {}
  var i, itm
  for (i = 0; i < keys.length; i++) {
    itm = msg.result[ keys[i] ]
    result[ keys[i] ] = this.gossipUtil.newItem(itm.age, itm.data)
  }
  var mergedViews = this.gossipUtil.mergeViews(msg.cluView, result)
  if (Object.keys(mergedViews).indexOf(this.peerId, 0) !== -1) delete mergedViews[this.peerId]
  this.view = this.selector.getClosestNeighbours(this.viewSize, mergedViews, null)
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

/**
* @memberof Vicinity
* @method increaseAge
* @description Look for this method at [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* for more details.*/
Vicinity.prototype.increaseAge = function () {
  var keys = Object.keys(this.view)
  for (var i = 0; i < keys.length; i++) this.view[ keys[i] ].age++
}

/**
* @memberof Vicinity
* @deprecated
* @method getSimilarPeerIds
* @description This method gives n peer identifiers from GossipProtocol.view
* These peers have the higher degree of similarity with the local peer.
* @param n Number of the required peer IDs.
* @returns Array Array of n peer IDs. */
Vicinity.prototype.getSimilarPeerIds = function (n) {
  if (n <= 0) return []
  var iDs = Object.keys(this.view)
  if (n >= iDs.length) return iDs
  else {
    var result = []
    for (var i = 0; i < n; i++) result.push(iDs[i])
    return result
  }
}
