require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/../../src/algorithms/Cyclon.js":[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
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

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../src/algorithms/Cyclon.js","/../../src/algorithms")
},{"../superObjs/GossipProtocol":"/../../src/superObjs/GossipProtocol.js","../superObjs/ViewSelector":"/../../src/superObjs/ViewSelector.js","_process":36,"buffer":29,"inherits":6}],"/../../src/algorithms/Vicinity.js":[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
* @module src/algorithms 
* @author Raziel Carvajal-Gomez raziel.carvajal@gmail.com */
module.exports = Vicinity
var inherits = require('inherits')
var GossipProtocol = require('../superObjs/GossipProtocol')
var ViewSelector = require('../superObjs/ViewSelector')
inherits(Vicinity, GossipProtocol)
/**
* @class Vicinity
* @extends GossipProtocol See [GossipProtocol]{@link module:src/superObjs#GossipProtocol}
* @description Implementation of the gossip-based protocol
* [Vicinity]{@link http://www.few.vu.nl/~spyros/papers/Thesis-Voulgaris.pdf} to form clusters
* of peers with similar profiles. The similarity of peers is obtained through one function
* that computes to which extent two peers' profiles are similar form each other. This similarity
* function is set by the user in the configuration object, see 
* [configurationObject]{@link module:../utils/ConfigurationObject.js}.
* @param algOpts Settings of the protocol
* @param debug Log the behavior of the protocol
* @param gossipUtil Common functions used by the protocols, see
* [GossilUtil]{@link module:src/utils#GossipUtil}
* @param isLogActivated Boolean to decide weather to send or not statistics about the protocol to
* the main thread
* @param profile Local peer's profile*/
function Vicinity (algOpts, debug, gossipUtil, isLogActivated, profile) {
  if (!(this instanceof Vicinity)) return Vicinity(algOpts, debug, gossipUtil, isLogActivated, profile)
  this.isLogActivated = isLogActivated
  GossipProtocol.call(this, algOpts, debug, gossipUtil, profile)
  this.selectionPolicy = algOpts.selectionPolicy
  this.selector = new ViewSelector(profile, debug, algOpts.similarityFunction)
  this.dependencies = algOpts.dependencies
  debug('Vicinity.init')
}
/**
* @memberof Vicinity
* @const defaultOpts
* @description Default values for the gossip attributes. During its instantiation, via the 
* [GossipFactory]{@link module:src/services/GossipFactory} object, if the user doesn't specify
* any attribute the algorithm will be initialized with the values in this object.
* @default*/
Vicinity.defaultOpts = {
  class: 'Vicinity',
  viewSize: 10,
  fanout: 5,
  periodTimeOut: 10000,
  propagationPolicy: { push: true, pull: true },
  selectionPolicy: 'biased' // random OR biased OR agr-biased
}
/**
* @memberof Vicinity
* @method selectPeer
* @description Select one peer ID from the view with the oldest age. For more details, look for
* this method at the [GossipProtocol]{@link module:src/superObjs#GossipProtocol} class.*/
Vicinity.prototype.selectPeer = function () { return this.gossipUtil.getOldestKey(this.view) }
/**
* @memberof Vicinity
* @method setMediator
* @description Sets an instance of the [GossipMediator]{@link module:src/controllers/GossipMediator} object
* to comunicate the main thread with the gossip protocol.*/
Vicinity.prototype.setMediator = function (mediator) {
  mediator.setDependencies(this.dependencies)
  this.gossipMediator = mediator
}
/**
* @memberof Vicinity
* @method initialize
* @description For more details, look for this method at the 
* [GossipProtocol]{@link module:src/superObjs#GossipProtocol} class.*/
Vicinity.prototype.initialize = function (keys) {
  if (keys.length > 0) {
    var i = 0
    while (i < this.viewSize && i < keys.length) {
      this.view[keys[i]] = this.gossipUtil.newItem(0, 'undefined')
      i++
    }
  }
}
/**
* @memberof Vicinity
* @method selectItemsToSend
* @description The selection of "this.viewSize" items is performed following one of the next
* cases: i) if selection = random, items from the local peer's view are chosen in a randomly way,
* ii) if selection = biased, the most similar items are chosen from the local peer's view and iii)
* if selection = agr-biased, the most similar items are chosen from the merge of the peer sampling
* view with the local peer's view. For more details, look for this method at the
* [GossipProtocol]{@link module:src/superObjs#GossipProtocol} class.
* @param receiver The selection of items will be sent to this peer
* @param gossMsgType Strting to define the type of gossip exchange, there are two possible values:
* i) GOSSIP-PUSH means to send items to an external peer or ii) GOSSIP-PULL to keep items from an
* external peer*/
Vicinity.prototype.selectItemsToSend = function (receiver, gossMsgType) {
  var dstPeer = receiver || this.selectPeer()
  if (!dstPeer) return
  if (receiver) debug(this.algoId + ': SelectItemsToSend, receiver is ' + receiver)
  else debug(this.algoId + ': SelectItemsToSend, receiver is ' + dstPeer + ' (oldest peer in view)')
  var clone = JSON.parse(JSON.stringify(this.view))
  delete clone[dstPeer]
  var subDict, msg
  switch (this.selectionPolicy) {
    case 'random':
      subDict = this.gossipUtil.getRandomSubDict(this.fanout - 1, clone)
      subDict[this.peerId] = this.gossipUtil.newItem(0, this.profile.getPayload())
      msg = {
        service: gossMsgType,
        header: 'outgoingMsg',
        emitter: this.peerId,
        receiver: dstPeer,
        payload: subDict,
        algoId: this.algoId
      }
      this.gossipMediator.postInMainThread(msg)
      break
    case 'biased':
      subDict = this.selector.getClosestNeighbours(this.fanout - 1, clone)
      subDict[this.peerId] = this.gossipUtil.newItem(0, this.profile.getPayload())
      msg = {
        service: gossMsgType,
        header: 'outgoingMsg',
        emitter: this.peerId,
        receiver: dstPeer,
        payload: subDict,
        algoId: this.algoId
      }
      this.gossipMediator.postInMainThread(msg)
      break
    case 'agr-biased':
      msg = {
        header: 'getDep',
        cluView: clone,
        receiver: dstPeer,
        emitter: this.algoId,
        callback: 'doAgrBiasedSelection',
        gossMsg: gossMsgType
      }
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
* most similar ones (similar items are obtained via the similarity function) in order to get
* the new view of the local peer. Once the merge is finished, the result view is sent to an
* external peer.
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
  delete mergedViews[ this.peerId ]
  var similarNeig = this.selector.getClosestNeighbours(this.fanout -1, mergedViews)
  similarNeig[ this.peerId ] = this.gossipUtil.newItem(0, this.profile.getPayload())
  var payload = {
    service: msg.gossMsg,
    header: 'outgoingMsg',
    emitter: this.peerId,
    receiver: msg.receiver,
    'payload': similarNeig,
    algoId: this.algoId
  }
  this.gossipMediator.postInMainThread(payload)
  // this.gossipMediator.sentActiveCycleStats()
}
/**
* @memberof Vicinity
* @method selectItemsToKeep
* @description For more details, look for this method at the
* [GossipProtocol]{@link module:src/superObjs#GossipProtocol} class
* @param msg Items from an external peer.*/
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
* the new view of the local peer. Once the merge is finished, the view Vicinity.view is
* updated with the merged view.
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
  this.view = this.selector.getClosestNeighbours(this.viewSize, mergedViews)
}
/**
* @memberof Vicinity
* @method increaseAge
* @description For more details, look for this method at the
* [GossipProtocol]{@link module:src/superObjs#GossipProtocol} class.*/
Vicinity.prototype.increaseAge = function () {
  var keys = Object.keys(this.view)
  for (var i = 0; i < keys.length; i++) this.view[ keys[i] ].age++
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../src/algorithms/Vicinity.js","/../../src/algorithms")
},{"../superObjs/GossipProtocol":"/../../src/superObjs/GossipProtocol.js","../superObjs/ViewSelector":"/../../src/superObjs/ViewSelector.js","_process":36,"buffer":29,"inherits":6}],"/../../src/controllers/GossipMediator.js":[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
* @module src/controllers*/
module.exports = GossipMediator
/**
* @class GossipMediator
* @description This class acts as a mediator between the [Coordinator]{@link module:src/controllers#Coordinator}
* (object in the main thread of the Javascript engine) and one gossip protocol both, the gossip
* protocol and the gossip mediator
* belongs to the context of one [Web Worker]{@link http://www.w3schools.com/html/html5_webworkers.asp}.
* The reason behind this separation is to avoid blocking the main thread when gossip computations
* take considerable time to be done. The creation of objects in the context of web workers is done
* in a dynamic fashion by the [GossipFactory]{@link module:src/services#GossipFactory}. Three types
* of retransmissions take place:
* i) Request to contact an external peer to perform a gossip exchange
* ii) Internal request, this happens when the current  gossip instance depends on the data shared by other
* gossip protocol (located in another web worker context)
* iii) Send data to the application
* Take into account that any WebRTC connection is performed by the main thread due to the restricted
* environment in web workers.
* @param algo Instance of one gossip protocol
* @param log Logger (see [LoggerForWebWorker]{@link module:src/utils#LoggerForWebWorker}) to
* monitor the actions in the web worker
* @param worker Reference to the actual worker thread
* @author Raziel Carvajal-Gomez <raziel.carvajal@gmail.com>*/
function GossipMediator (algo, worker, debug) {
  this.algo = algo
  this.worker = worker
  this.debug = debug
  this.dependencies = {}
  this.viewUpdsLogCounter = 0
  this.activCycLogCounter = 0
  this.debug('GossipMediator.init')
}
/**
* @memberof GossipMediator
* @method setDependencies
* @description Fill the "dependencies" object to distinguish between objects living in the web worker
* context (internal dependency) and those who belong to the main thread context (external dependency)
* @param algoDependencies Dependencies of the gossip algorithm (see
* [configuration object]{@link module:src/confObjs#configurationObj}) initialized in the web worker
* context*/
GossipMediator.prototype.setDependencies = function (algoDependencies) {
  var external, dep
  for (var i = 0; i < algoDependencies.length; i++) {
    dep = algoDependencies[i]
    external = typeof exports[dep.algoId] === 'undefined'
    this.dependencies[dep.algoId] = { property: dep.algoAttribute, isExternal: external }
  }
}
/**
* @memberof GossipMediator
* @method sentActiveCycleStats
* @description In order to check if the use of web workers has an impact on the gossip protocol this
* method calculates how many seconds takes to perform a gossip cycle, the value of this offset is sent
* to the main thread.*/
GossipMediator.prototype.sentActiveCycleStats = function () {
  this.activCycLogCounter++
  var now = new Date()
  var msg = {
    header: 'actCycLog',
    algoId: this.algo.algoId,
    loop: this.algo.loop,
    counter: this.activCycLogCounter,
    'offset': (now - this.lastActCycTime) / 1000
  }
  this.lastActCycTime = now
  this.postInMainThread(msg)
}
/**
* @memberof GossipMediator
* @method _doActiveThread
* @description The periodic execution of one gossip cycle is performed in this method, normally what
* the protocol does is to chose items from its local view for being exchanged with other peer.*/
GossipMediator.prototype._doActiveThread = function () {
  // first try for measuring stats (not a good idea)
  // self.sentActiveCycleStats()
  // performing periodic gossip selection (no changes in view are done)
  this.algo.loop++           
  this.algo.increaseAge()    
  if (this.algo.propagationPolicy.push) this.algo.selectItemsToSend(undefined, 'GOSSIP-PUSH')
  this.lastActCycTime = new Date()
  var log = 'CURRENT VIEW: ' + this.algo.algoId + '_' + this.algo.loop + '_' +
    JSON.stringify(this.algo.view)
  //var log = {
  //  loop: this.algo.loop,
  //  algoId: this.algo.algoId,
  //  view: JSON.stringify(this.algo.view)
  //}
  debug('posting log')
  //this.postInMainThread({ header: 'logInConsole', log: JSON.stringify(log) })
  this.postInMainThread({ header: 'logInConsole', 'log': log })
}
/**
* @memberof GossipMediator
* @method applyDependency
* @description Dependencies between gossip protocols, see the
* [configuration object]{@link module:src/confObjs#configurationObj} for more details, are linked
* by this method in two cases: local dependencies will refer to objects in the web worker context and
* external dependencies will refer to objects in the main thread.
* @param msg Object with attributes of the dependency, as: dependency ID, function to refer, etc.*/
GossipMediator.prototype.applyDependency = function (msg) {
  if (this.dependencies.hasOwnProperty(msg.depId)) {
    var dep = this.dependencies[msg.depId]
    if (dep.isExternal) this.postInMainThread(msg)
    else {
      var objInWorker = exports[msg.depId]
      var obj = objInWorker[msg.depAtt]
      if (objInWorker !== 'undefined' && typeof obj === 'object') {
        msg.result = obj
        msg.callback(msg)
      } else this.debug('dependency obj is not in worker scope')
    }
  } else this.debug('dependency: ' + msg.depId + ' is not recognized')
}
/**
* @memberof GossipMediator
* @method listen
* @description Every message exchange between the main thread and the web worker is handled by
* this method.*/
GossipMediator.prototype.listen = function () {
  var self = this
  this.worker.addEventListener('message', function (e) {
    var keys, arr, i
    var msg = e.data
    switch (msg.header) {
      case 'firstView':
        self.algo.initialize(msg.view)
        break
      case 'gossipLoop':
        self._doActiveThread()
        break
      case 'gossipPushRec':
        self.algo.selectItemsToKeep(msg)
        self.algo.selectItemsToSend(msg.emitter, 'GOSSIP-PULL') 
        break
      case 'gossipPullRec':
        if (self.algo.propagationPolicy.pull) self.algo.selectItemsToKeep(msg)
        break
      case 'getDep':
        var obj = self.algo[msg.depAtt]
        if (obj !== 'undefined') {
          msg.header = 'setDep'
          msg.result = obj
          self.worker.postMessage(msg)
        } else {
          self.log.error('attribute ' + msg.depAtt + ' does not exists')
        }
        break
      case 'applyDep':
        self.algo[msg.callback](msg)
        break
      case 'view':
        msg.header = 'drawGraph'
        msg.view = Object.keys(self.algo.view)
        msg.algoId = self.algo.algoId
        self.worker.postMessage(msg)
        break
      case 'delete':
        if (Object.keys(self.algo.view).indexOf(msg.item, 0) !== -1) delete self.algo.view[msg.item]
        break
      case 'deleteViewItems':
        var items = Object.keys(self.algo.view)
        for (var i = 0; i < msg.items.length; i++)
          if (items.indexOf(msg.items[i],0) !== -1 ) delete self.algo.view[msg.items[i]]
        self.algo.viewSize = msg.newSize
        break
      case 'updateProfile':
        self.algo.profile.setPayload(msg.profile)
        break
      case 'getNeighbourhood':
        self.worker.postMessage({
          header: 'neigs',
          view: Object.keys(self.algo.view),
          algoId: self.algo.algoId,
          loop: self.algo.loop
        })
        break
      default:
        self.log.warn('header: ' + msg.header + ' is unknown')
        break
    }
  }, false)
}
/**
* @memberof GossipMediator
* @method postInMainThread
* @description Post messages to the [Coordinator]{@link module:src/controllers#Coordinator}
* @param msg Message to send, this object contains one header to identifies what will be done
* by the Coordinator*/
GossipMediator.prototype.postInMainThread = function (msg) { this.worker.postMessage(msg) }

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../src/controllers/GossipMediator.js","/../../src/controllers")
},{"_process":36,"buffer":29}],"/../../src/superObjs/GossipProtocol.js":[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
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

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../src/superObjs/GossipProtocol.js","/../../src/superObjs")
},{"_process":36,"buffer":29}],"/../../src/superObjs/ViewSelector.js":[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
*@module src/superObjs*/
module.exports = ViewSelector
/**
* @class ViewSelector
* @description Ranks items in a gossip view according to a similarity function, this function
* evaluates to which extend two peer profiles differs from each other.
* @param profile Profile of the local peer
* @param debug debug (see [LoggerForWebWorker]{@link module:src/utils#LoggerForWebWorker}) to
* monitor the actions of the ViewSelector
* @param simFunc Reference to the similarity function
* @author Raziel Carvajal-Gomez <raziel.carvajal@gmail.com> */
function ViewSelector (profile, debug, simFunc) {
  this.profile = profile
  this.debug = debug
  this.simFunc = simFunc
}
/**
* @memberof ViewSelector
* @method getClosestNeighbours
* @description This method gets the N most similar items in the local peer's view
* @param n Number of the most similar items to the local peer
* @param view Source where the most similar items are taken
* @param newItem This item contains the ID of the local peer, the local peer's profile and its age
* initialize to zero
* @returns Object Subset of the local peer's view with the n most similar peers*/
ViewSelector.prototype.getClosestNeighbours = function (n, view) {
  this.debug('SELECTOR PROFILE: ' + this.profile.getPayload())
  var keys = Object.keys(view)
  if (n <= 0 || keys.length === 0 || keys.length < n) {
    this.debug('Base case in SimFun')
    return view
  }
  return this.getNsimilarPeers(view, n, keys)
}
/**
* @memberof ViewSelector
* @method getNsimilarPeers
* @description This method gets the N most similar items in the local peer's view
* @param n Number of the most similar items to the local peer
* @param view Source where the most similar items are taken
* @param keys Properties of the object that represents the local peer's view
* @returns Object Subset of the local peer's view with the n most similar peers*/
ViewSelector.prototype.getNsimilarPeers = function (view, n, keys) {
  var values = []
  var i, itm
  for (i = 0; i < keys.length; i++) {
    values.push({
      k: keys[i],
      v: this.simFunc(this.profile.getPayload(), view[ keys[i] ].data)
    })
  }
  values.sort(function (a, b) { return a.v - b.v }).reverse()
  var result = {}
  i = 0
  while (i < n && i < values.length) {
    itm = view[ values[i].k ]
    itm.ev = values[i].v.toFixed(3)
    result[ values[i].k ] = itm
    i++
  }
  return result
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../src/superObjs/ViewSelector.js","/../../src/superObjs")
},{"_process":36,"buffer":29}],"/../../src/utils/GossipUtil.js":[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
*@module src/utils*/
// TODO Find a way to export (NodeJS fashion) in a Web Worker scope, because "require" could be
// used with "workerify" but not in "webworker-threads" for NodeJS. Now the solution is to
// remove every require (which isn't elegant) and replace it whith the anonymous function to
// export. Other solution could be to edit the sources on the fly adding the right headers
module.exports = GossipUtil
/**
* @class GossipUtil
* @description This class contains miscellaneous operations used by gossip protocols.
* @author Raziel Carvajal-Gomez <raziel.carvajal@gmail.com>*/
function GossipUtil (debug) {
  if (!(this instanceof GossipUtil)) return GossipUtil(debug)
  this.debug = debug
  this.electionLimit = 2
  this.alreadyChosen = []
  this._loopOfElection = 0
  this._algorithmsDb = ['algorithms/Vicinity.js', 'algorithms/Cyclon.js']
  debug('GossipUtil.init')
}
/**
* @memberof GossipUtil
* @method newItem
* @description Returns one object with two properties: its age (time stamp) and its data
* (application dependant object).
* @param age Age of the item (integer)
* @param data Object to share by the gossip protocol (application dependant)
* @return Object Object with the properties age and data*/
GossipUtil.prototype.newItem = function (age, data) { return { age: age, data: data } }
/**
* @memberof GossipUtil
* @method getRandomSubDict
* @description Get a random set of n items from one object
* @param n Size of the new object
* @param src Original object
* @returns Object Object with a subset of items from the source*/
GossipUtil.prototype.getRandomSubDict = function (n, src) {
  var keys = Object.keys(src)
  if (n <= 0 || keys.length === 0) return {}
  if (n >= keys.length) return src
  else {
    var keys = Object.keys(src)
    var tmpDict = {}
    var result = {}
    var key, tmpAr, i
    for (i = 0; i < keys.length; i++) tmpDict[ keys[i] ] = 1
    i = 0
    do {
      tmpAr = Object.keys(tmpDict)
      key = tmpAr[ Math.floor(Math.random() * tmpAr.length) ]
      result[key] = src[key]
      delete tmpDict[key]
      i++
    } while (i !== n)
    return result
  }
}
/**
* @memberof GossipUtil
* @method getOldestKey
* @description Get the key of the element with the oldest age in the object
* @param dictio Source object
* @returns String Key of the item with the oldest age*/
GossipUtil.prototype.getOldestKey = function (dictio) {
  var keys = Object.keys(dictio)
  if (keys.length === 0) return null
  var items = []
  var i
  for (i = 0; i < keys.length; i++) items.push({ k: keys[i], v: dictio[ keys[i] ].age })
  items.sort(function(a, b) { return (a.v - b.v) }).reverse()
  if (items.length === 1 || items[0].v !== items[1].v) return items[0].k
  else {
    var sameAgeItms = {}
    var age = items[0].v
    sameAgeItms[items[0].k] = age
    for (i = 1; i < items.length; i++) if (age === items[i].v) sameAgeItms[ items[i].k ] = age
    var randObj = this.getRandomSubDict(1, sameAgeItms)
    return Object.keys(randObj)[0]
  }
}
/**
* @memberof GossipUtil
* @method getRandomKey
* @description Get a random key from one object
* @param dict Source object
* @returns String Random key from the source*/
GossipUtil.prototype.getRandomKey = function (dict) {
  var keys = Object.keys(dict)
  var key
  if (keys.length === 0) this.debug('Empty dictionary, key to return: null')
  else {
    var rNum = keys.length === 1 ? 0 : Math.floor(Math.random() * keys.length)
    key = keys[rNum]
  }
  return key
}
/**
* @memberof GossipUtil
* @method removeRandomly
* @description Removes N elements from one object in a randomly way
* @param n Number of elements to remove
* @param dic Source object*/
GossipUtil.prototype.removeRandomly = function (n, dic) {
  if (n === 0) return
  else {
    var tmpDic = {}
    var tmpAr, i, key
    var keys = Object.keys(dic)
    for (i = 0; i < keys.length; i++) tmpDic[keys[i]] = 1
    for (i = 0; i < n; i++) {
      tmpAr = Object.keys(tmpDic)
      key = tmpAr[Math.floor(Math.random() * tmpAr.length)]
      delete tmpDic[key]
      delete dic[key]
    }
  }
}
/**
* @memberof GossipUtil
* @method mergeViews
* @description Merge two objects, the result does not contain repetitions
* @param v1 First object to merge
* @param v2 Second object to merge
* @returns Object The result of merging v1 and v2*/
GossipUtil.prototype.mergeViews = function (v1, v2) {
  var keysV1 = Object.keys(v1)
  var keysV2 = Object.keys(v2)
  var i, props, j
  var result = {}
  for (i = 0; i < keysV1.length; i++) result[ keysV1[i] ] = v1[ keysV1[i] ]
  for (i = 0; i < keysV2.length; i++) {
    if (Object.keys(result).indexOf(keysV2[i], 0) !== -1) {
      if (v2[ keysV2[i] ].age < result[ keysV2[i] ].age) {
        props = Object.keys(v2[ keysV2[i] ])
        for (j = 0; j < props.length; j++) result[ keysV2[i] ][ props[j] ] = v2[ keysV2[i] ][ props[j] ]
      }
    } else result[ keysV2[i] ] = v2[ keysV2[i] ]
  }
  return result
}
/**
* @memberof GossipUtil
* @method extendProperties
* @description Increases the number of properties/values from one object
* @param dst Object to extend
* @param src The properties/values of this object will be part of the destination object*/
GossipUtil.prototype.extendProperties = function (dst, src) {
  var keys = Object.keys(src)
  for (var i = 0; i < keys.length; i++) {
    if (!dst.hasOwnProperty(keys[i])) dst[keys[i]] = src[keys[i]]
  }
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../src/utils/GossipUtil.js","/../../src/utils")
},{"_process":36,"buffer":29}],"/../../src/utils/Profile.js":[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = Profile
var debug = typeof window === 'undefined' ? require('debug')('profile') : require('debug').log

function Profile (payload) {
  if (!(this instanceof Profile)) return new Profile(payload)
  console.log('MY PROFILE IS: ' + JSON.stringify(payload))
  this._payload = payload
}

Profile.prototype.getPayload = function () { return this._payload }

Profile.prototype.setPayload = function (newPayload) {
  debug('SETTING PAYLOAD PROFILE FROM: ' + JSON.stringify(this._payload) + ' TO: ' + JSON.stringify(newPayload))
  this._payload = newPayload
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../src/utils/Profile.js","/../../src/utils")
},{"_process":36,"buffer":29,"debug":2}],1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
window.Coordinator = require('../../src/controllers/Coordinator')

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/main.js","/")
},{"../../src/controllers/Coordinator":20,"_process":36,"buffer":29}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/debug/browser.js","/../../node_modules/debug")
},{"./debug":3,"_process":36,"buffer":29}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/debug/debug.js","/../../node_modules/debug")
},{"_process":36,"buffer":29,"ms":4}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/debug/node_modules/ms/index.js","/../../node_modules/debug/node_modules/ms")
},{"_process":36,"buffer":29}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var hat = module.exports = function (bits, base) {
    if (!base) base = 16;
    if (bits === undefined) bits = 128;
    if (bits <= 0) return '0';
    
    var digits = Math.log(Math.pow(2, bits)) / Math.log(base);
    for (var i = 2; digits === Infinity; i *= 2) {
        digits = Math.log(Math.pow(2, bits / i)) / Math.log(base) * i;
    }
    
    var rem = digits - Math.floor(digits);
    
    var res = '';
    
    for (var i = 0; i < Math.floor(digits); i++) {
        var x = Math.floor(Math.random() * base).toString(base);
        res = x + res;
    }
    
    if (rem) {
        var b = Math.pow(base, rem);
        var x = Math.floor(Math.random() * b).toString(base);
        res = x + res;
    }
    
    var parsed = parseInt(res, base);
    if (parsed !== Infinity && parsed >= Math.pow(2, bits)) {
        return hat(bits, base)
    }
    else return res;
};

hat.rack = function (bits, base, expandBy) {
    var fn = function (data) {
        var iters = 0;
        do {
            if (iters ++ > 10) {
                if (expandBy) bits += expandBy;
                else throw new Error('too many ID collisions, use more bits')
            }
            
            var id = hat(bits, base);
        } while (Object.hasOwnProperty.call(hats, id));
        
        hats[id] = data;
        return id;
    };
    var hats = fn.hats = {};
    
    fn.get = function (id) {
        return fn.hats[id];
    };
    
    fn.set = function (id, value) {
        fn.hats[id] = value;
        return fn;
    };
    
    fn.bits = bits || 128;
    fn.base = base || 16;
    return fn;
};

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/hat/index.js","/../../node_modules/hat")
},{"_process":36,"buffer":29}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/inherits/inherits_browser.js","/../../node_modules/inherits")
},{"_process":36,"buffer":29}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = require('./lib/its.js');
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/its/index.js","/../../node_modules/its")
},{"./lib/its.js":8,"_process":36,"buffer":29}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Helpers
var slice = Array.prototype.slice;
var toString = Object.prototype.toString;

var templateRegEx = /%s/; // The template placeholder, used to split message templates

/** A basic templating function. 
	
	Takes a string with 0 or more '%s' placeholders and an array to populate it with.

	@param {String} messageTemplate A string which may or may not have 0 or more '%s' to denote argument placement
	@param {Array} [messageArguments] Items to populate the template with

	@example
		templatedMessage("Hello"); // returns "Hello"
		templatedMessage("Hello, %s", ["world"]); // returns "Hello, world"
		templatedMessage("Hello, %s. It's %s degrees outside.", ["world", 72]); // returns "Hello, world. It's 72 degrees outside"

	@returns {String} The resolved message
*/
var templatedMessage = function(messageTemplate, messageArguments){
	var result = [],
		messageArray = messageTemplate.split(templateRegEx),
		index = 0,
		length = messageArray.length;

	for(; index < length; index++){
		result.push(messageArray[index]);
		result.push(messageArguments[index]);
	}

	return result.join('');
};


/** Generic check function which throws an error if a given expression is false
*
*	The params list is a bit confusing, check the examples to see the available ways of calling this function
*
*	@param {Boolean} expression The determinant of whether an exception is thrown
*	@param {String|Object} [messageOrErrorType] A message or an ErrorType object to throw if expression is false
*   @param {String|Object} [messageOrMessageArgs] A message, message template, or a message argument
*	@param {...Object} [messageArgs] Arguments for a provided message template
*
*	@returns {Boolean} Returns the expression passed  
*	@throws {Error}
*
*	@example
*		its(0 < 10); // returns true
*		its(0 > 10); // throws Error with no message
*		its(0 > 10, "Something went wrong!"); // throws Error with message: "Something went wrong!"
*		its(0 > 10, "%s went %s!", "something", "wrong"); // throws Error with message: "Something went wrong!"
*		its(0 > 10, RangeError, "%s went %s!", "something", "wrong"); // throws RangeError with message: "Something went wrong!"
*		its(0 > 10, RangeError); // throws RangeError with no message
*/
var its = module.exports = function(expression, messageOrErrorType){
	if(expression === false){
		if(messageOrErrorType && typeof messageOrErrorType !== "string"){ // Check if custom error object passed
			throw messageOrErrorType(arguments.length > 3 ? templatedMessage(arguments[2], slice.call(arguments,3)) : arguments[2]);	
		} else {
			throw new Error(arguments.length > 2 ? templatedMessage(messageOrErrorType, slice.call(arguments,2)) : messageOrErrorType);	
		}
	}
	return expression;
};

/** Throws a TypeError if a given expression is false
*
*	@param {Boolean} expression The determinant of whether an exception is thrown
*	@param {String} [message] A message or message template for the error (if it gets thrown)
*	@param {...Object} [messageArgs] Arguments for a provided message template
*
*	@returns {Boolean} Returns the expression passed  
*	@throws {TypeError}
*
*	@example
*		its.type(typeof "Team" === "string"); // returns true
*		its.type(typeof "Team" === "number"); // throws TypeError with no message
*		its.type(void 0, "Something went wrong!"); // throws TypeError with message: "Something went wrong!"
*		its.type(void 0, "%s went %s!", "something", "wrong"); // throws TypeError with message: "Something went wrong!"
*/
its.type = function(expression, message){
	if(expression === false){
		throw new TypeError(arguments.length > 2 ? templatedMessage(message, slice.call(arguments,2)) : message);
	}
	return expression;
};

// Helpers
its.undefined = function(expression){
	return its.type.apply(null, [expression === void 0].concat(slice.call(arguments, 1)));
};

its.null = function(expression){
	return its.type.apply(null, [expression === null].concat(slice.call(arguments, 1)));
};

its.boolean = function(expression){
	return its.type.apply(null, [expression === true || expression === false || toString.call(expression) === "[object Boolean]"].concat(slice.call(arguments, 1)));
};

its.array = function(expression){
	return its.type.apply(null, [toString.call(expression) === "[object Array]"].concat(slice.call(arguments, 1)));
};

its.object = function(expression){
	return its.type.apply(null, [expression === Object(expression)].concat(slice.call(arguments, 1)));
};

/** This block creates 
*	its.function
*	its.string
*	its.number
*	its.date
*	its.regexp
*/
(function(){
	var types = [
			['args','Arguments'],
			['func', 'Function'], 
			['string', 'String'], 
			['number', 'Number'], 
			['date', 'Date'], 
			['regexp', 'RegExp']
		],
		index = 0,
		length = types.length;

	for(; index < length; index++){
		(function(){
			var theType = types[index];
			its[theType[0]] = function(expression){
				return its.type.apply(null, [toString.call(expression) === '[object ' + theType[1] + ']'].concat(slice.call(arguments, 1)));
			};
		}());
	}
}());

// optimization from underscore.js by documentcloud -- underscorejs.org
if (typeof (/./) !== 'function') {
	its.func = function(expression) {
		return its.type.apply(null, [typeof expression === "function"].concat(slice.call(arguments, 1)));
	};
}

/** Throws a ReferenceError if a given expression is false
*
*	@param {Boolean} expression The determinant of whether an exception is thrown
*	@param {String} [message] A message or message template for the error (if it gets thrown)
*	@param {...Object} [messageArgs] Arguments for a provided message template
*
*	@returns {Object} Returns the expression passed  
*	@throws {ReferenceError}
*
*	@example
*		its.defined("Something"); // returns true
*		its.defined(void 0); // throws ReferenceError with no message
*		its.defined(void 0, "Something went wrong!"); // throws ReferenceError with message: "Something went wrong!"
*		its.defined(void 0, "%s went %s!", "something", "wrong"); // throws ReferenceError with message: "Something went wrong!"
*/
its.defined = function(expression, message){
	if(expression === void 0){
		throw new ReferenceError(arguments.length > 2 ? templatedMessage(message, slice.call(arguments,2)) : message);
	}

	return expression;
};

/** Throws a RangeError if a given expression is false
*
*	@param {Boolean} expression The determinant of whether an exception is thrown
*	@param {String} [message] A message or message template for the error (if it gets thrown)
*	@param {...Object} [messageArgs] Arguments for a provided message template
*
*	@returns {Boolean} Returns the expression passed  
*	@throws {RangeError}
*
*	@example
*		its.range(1 > 0); // returns true
*		its.range(1 < 2); // throws RangeError with no message
*		its.range(1 < 2 && 1 > 2, "Something went wrong!"); // throws RangeError with message: "Something went wrong!"
*		its.range(1 < 2 && 1 > 2, "%s went %s!", "something", "wrong"); // throws RangeError with message: "Something went wrong!"
*/
its.range = function(expression, message){
	if(expression === false){
		throw new RangeError(arguments.length > 2 ? templatedMessage(message, slice.call(arguments,2)) : message);
	}

	return expression;
};
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/its/lib/its.js","/../../node_modules/its/lib")
},{"_process":36,"buffer":29}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* global Blob */

module.exports = Peer

var debug = require('debug')('simple-peer')
var getBrowserRTC = require('get-browser-rtc')
var hat = require('hat')
var inherits = require('inherits')
var isTypedArray = require('is-typedarray')
var once = require('once')
var stream = require('stream')
var toBuffer = require('typedarray-to-buffer')

inherits(Peer, stream.Duplex)

/**
 * WebRTC peer connection. Same API as node core `net.Socket`, plus a few extra methods.
 * Duplex stream.
 * @param {Object} opts
 */
function Peer (opts) {
  var self = this
  if (!(self instanceof Peer)) return new Peer(opts)
  self._debug('new peer %o', opts)

  if (!opts) opts = {}
  opts.allowHalfOpen = false
  if (opts.highWaterMark == null) opts.highWaterMark = 1024 * 1024

  stream.Duplex.call(self, opts)

  self.initiator = opts.initiator || false
  self.channelConfig = opts.channelConfig || Peer.channelConfig
  self.channelName = opts.channelName || hat(160)
  if (!opts.initiator) self.channelName = null
  self.config = opts.config || Peer.config
  self.constraints = opts.constraints || Peer.constraints
  self.reconnectTimer = opts.reconnectTimer || 0
  self.sdpTransform = opts.sdpTransform || function (sdp) { return sdp }
  self.stream = opts.stream || false
  self.trickle = opts.trickle !== undefined ? opts.trickle : true

  self.destroyed = false
  self.connected = false

  // so Peer object always has same shape (V8 optimization)
  self.remoteAddress = undefined
  self.remoteFamily = undefined
  self.remotePort = undefined
  self.localAddress = undefined
  self.localPort = undefined

  self._wrtc = opts.wrtc || getBrowserRTC()
  if (!self._wrtc) {
    if (typeof window === 'undefined') {
      throw new Error('No WebRTC support: Specify `opts.wrtc` option in this environment')
    } else {
      throw new Error('No WebRTC support: Not a supported browser')
    }
  }

  self._maxBufferedAmount = opts.highWaterMark
  self._pcReady = false
  self._channelReady = false
  self._iceComplete = false // ice candidate trickle done (got null candidate)
  self._channel = null
  self._pendingCandidates = []

  self._chunk = null
  self._cb = null
  self._interval = null
  self._reconnectTimeout = null

  self._pc = new (self._wrtc.RTCPeerConnection)(self.config, self.constraints)
  self._pc.oniceconnectionstatechange = self._onIceConnectionStateChange.bind(self)
  self._pc.onsignalingstatechange = self._onSignalingStateChange.bind(self)
  self._pc.onicecandidate = self._onIceCandidate.bind(self)

  if (self.stream) self._pc.addStream(self.stream)
  self._pc.onaddstream = self._onAddStream.bind(self)

  if (self.initiator) {
    self._setupData({ channel: self._pc.createDataChannel(self.channelName, self.channelConfig) })
    self._pc.onnegotiationneeded = once(self._createOffer.bind(self))
    // Only Chrome triggers "negotiationneeded"; this is a workaround for other
    // implementations
    if (typeof window === 'undefined' || !window.webkitRTCPeerConnection) {
      self._pc.onnegotiationneeded()
    }
  } else {
    self._pc.ondatachannel = self._setupData.bind(self)
  }

  self.on('finish', function () {
    if (self.connected) {
      // When local peer is finished writing, close connection to remote peer.
      // Half open connections are currently not supported.
      // Wait a bit before destroying so the datachannel flushes.
      // TODO: is there a more reliable way to accomplish this?
      setTimeout(function () {
        self._destroy()
      }, 100)
    } else {
      // If data channel is not connected when local peer is finished writing, wait until
      // data is flushed to network at "connect" event.
      // TODO: is there a more reliable way to accomplish this?
      self.once('connect', function () {
        setTimeout(function () {
          self._destroy()
        }, 100)
      })
    }
  })
}

Peer.WEBRTC_SUPPORT = !!getBrowserRTC()

/**
 * Expose config, constraints, and data channel config for overriding all Peer
 * instances. Otherwise, just set opts.config, opts.constraints, or opts.channelConfig
 * when constructing a Peer.
 */
Peer.config = {
  iceServers: [
    {
      url: 'stun:23.21.150.121', // deprecated, replaced by `urls`
      urls: 'stun:23.21.150.121'
    }
  ]
}
Peer.constraints = {}
Peer.channelConfig = {}

Object.defineProperty(Peer.prototype, 'bufferSize', {
  get: function () {
    var self = this
    return (self._channel && self._channel.bufferedAmount) || 0
  }
})

Peer.prototype.address = function () {
  var self = this
  return { port: self.localPort, family: 'IPv4', address: self.localAddress }
}

Peer.prototype.signal = function (data) {
  var self = this
  if (self.destroyed) throw new Error('cannot signal after peer is destroyed')
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch (err) {
      data = {}
    }
  }
  self._debug('signal()')

  function addIceCandidate (candidate) {
    try {
      self._pc.addIceCandidate(
        new self._wrtc.RTCIceCandidate(candidate), noop, self._onError.bind(self)
      )
    } catch (err) {
      self._destroy(new Error('error adding candidate: ' + err.message))
    }
  }

  if (data.sdp) {
    self._pc.setRemoteDescription(new (self._wrtc.RTCSessionDescription)(data), function () {
      if (self.destroyed) return
      if (self._pc.remoteDescription.type === 'offer') self._createAnswer()

      self._pendingCandidates.forEach(addIceCandidate)
      self._pendingCandidates = []
    }, self._onError.bind(self))
  }
  if (data.candidate) {
    if (self._pc.remoteDescription) addIceCandidate(data.candidate)
    else self._pendingCandidates.push(data.candidate)
  }
  if (!data.sdp && !data.candidate) {
    self._destroy(new Error('signal() called with invalid signal data'))
  }
}

/**
 * Send text/binary data to the remote peer.
 * @param {TypedArrayView|ArrayBuffer|Buffer|string|Blob|Object} chunk
 */
Peer.prototype.send = function (chunk) {
  var self = this

  if (!isTypedArray.strict(chunk) && !(chunk instanceof ArrayBuffer) &&
    !Buffer.isBuffer(chunk) && typeof chunk !== 'string' &&
    (typeof Blob === 'undefined' || !(chunk instanceof Blob))) {
    chunk = JSON.stringify(chunk)
  }

  // `wrtc` module doesn't accept node.js buffer
  if (Buffer.isBuffer(chunk) && !isTypedArray.strict(chunk)) {
    chunk = new Uint8Array(chunk)
  }

  var len = chunk.length || chunk.byteLength || chunk.size
  self._channel.send(chunk)
  self._debug('write: %d bytes', len)
}

Peer.prototype.destroy = function (onclose) {
  var self = this
  self._destroy(null, onclose)
}

Peer.prototype._destroy = function (err, onclose) {
  var self = this
  if (self.destroyed) return
  if (onclose) self.once('close', onclose)

  self._debug('destroy (error: %s)', err && err.message)

  self.readable = self.writable = false

  if (!self._readableState.ended) self.push(null)
  if (!self._writableState.finished) self.end()

  self.destroyed = true
  self.connected = false
  self._pcReady = false
  self._channelReady = false

  self._chunk = null
  self._cb = null
  clearInterval(self._interval)
  clearTimeout(self._reconnectTimeout)

  if (self._pc) {
    try {
      self._pc.close()
    } catch (err) {}

    self._pc.oniceconnectionstatechange = null
    self._pc.onsignalingstatechange = null
    self._pc.onicecandidate = null
  }

  if (self._channel) {
    try {
      self._channel.close()
    } catch (err) {}

    self._channel.onmessage = null
    self._channel.onopen = null
    self._channel.onclose = null
  }
  self._pc = null
  self._channel = null

  if (err) self.emit('error', err)
  self.emit('close')
}

Peer.prototype._setupData = function (event) {
  var self = this
  self._channel = event.channel
  self.channelName = self._channel.label

  self._channel.binaryType = 'arraybuffer'
  self._channel.onmessage = self._onChannelMessage.bind(self)
  self._channel.onopen = self._onChannelOpen.bind(self)
  self._channel.onclose = self._onChannelClose.bind(self)
}

Peer.prototype._read = function () {}

Peer.prototype._write = function (chunk, encoding, cb) {
  var self = this
  if (self.destroyed) return cb(new Error('cannot write after peer is destroyed'))

  if (self.connected) {
    try {
      self.send(chunk)
    } catch (err) {
      return self._onError(err)
    }
    if (self._channel.bufferedAmount > self._maxBufferedAmount) {
      self._debug('start backpressure: bufferedAmount %d', self._channel.bufferedAmount)
      self._cb = cb
    } else {
      cb(null)
    }
  } else {
    self._debug('write before connect')
    self._chunk = chunk
    self._cb = cb
  }
}

Peer.prototype._createOffer = function () {
  var self = this
  if (self.destroyed) return

  self._pc.createOffer(function (offer) {
    if (self.destroyed) return
    offer.sdp = self.sdpTransform(offer.sdp)
    self._pc.setLocalDescription(offer, noop, self._onError.bind(self))
    var sendOffer = function () {
      var signal = self._pc.localDescription || offer
      self._debug('signal')
      self.emit('signal', {
        type: signal.type,
        sdp: signal.sdp
      })
    }
    if (self.trickle || self._iceComplete) sendOffer()
    else self.once('_iceComplete', sendOffer) // wait for candidates
  }, self._onError.bind(self), self.offerConstraints)
}

Peer.prototype._createAnswer = function () {
  var self = this
  if (self.destroyed) return

  self._pc.createAnswer(function (answer) {
    if (self.destroyed) return
    answer.sdp = self.sdpTransform(answer.sdp)
    self._pc.setLocalDescription(answer, noop, self._onError.bind(self))
    var sendAnswer = function () {
      var signal = self._pc.localDescription || answer
      self._debug('signal')
      self.emit('signal', {
        type: signal.type,
        sdp: signal.sdp
      })
    }
    if (self.trickle || self._iceComplete) sendAnswer()
    else self.once('_iceComplete', sendAnswer)
  }, self._onError.bind(self), self.answerConstraints)
}

Peer.prototype._onIceConnectionStateChange = function () {
  var self = this
  if (self.destroyed) return
  var iceGatheringState = self._pc.iceGatheringState
  var iceConnectionState = self._pc.iceConnectionState
  self._debug('iceConnectionStateChange %s %s', iceGatheringState, iceConnectionState)
  self.emit('iceConnectionStateChange', iceGatheringState, iceConnectionState)
  if (iceConnectionState === 'connected' || iceConnectionState === 'completed') {
    clearTimeout(self._reconnectTimeout)
    self._pcReady = true
    self._maybeReady()
  }
  if (iceConnectionState === 'disconnected') {
    if (self.reconnectTimer) {
      // If user has set `opt.reconnectTimer`, allow time for ICE to attempt a reconnect
      clearTimeout(self._reconnectTimeout)
      self._reconnectTimeout = setTimeout(function () {
        self._destroy()
      }, self.reconnectTimer)
    } else {
      self._destroy()
    }
  }
  if (iceConnectionState === 'closed') {
    self._destroy()
  }
}

Peer.prototype._maybeReady = function () {
  var self = this
  self._debug('maybeReady pc %s channel %s', self._pcReady, self._channelReady)
  if (self.connected || self._connecting || !self._pcReady || !self._channelReady) return
  self._connecting = true

  if (!self._pc.getStats) {
    onStats([])
  } else if (typeof window !== 'undefined' && !!window.mozRTCPeerConnection) {
    self._pc.getStats(null, function (res) {
      var items = []
      res.forEach(function (item) {
        items.push(item)
      })
      onStats(items)
    }, self._onError.bind(self))
  } else {
    self._pc.getStats(function (res) {
      var items = []
      res.result().forEach(function (result) {
        var item = {}
        result.names().forEach(function (name) {
          item[name] = result.stat(name)
        })
        item.id = result.id
        item.type = result.type
        item.timestamp = result.timestamp
        items.push(item)
      })
      onStats(items)
    })
  }

  function onStats (items) {
    items.forEach(function (item) {
      if (item.type === 'remotecandidate') {
        self.remoteAddress = item.ipAddress
        self.remotePort = Number(item.portNumber)
        self.remoteFamily = 'IPv4'
        self._debug(
          'connect remote: %s:%s (%s)',
          self.remoteAddress, self.remotePort, self.remoteFamily
        )
      } else if (item.type === 'localcandidate' && item.candidateType === 'host') {
        self.localAddress = item.ipAddress
        self.localPort = Number(item.portNumber)
        self._debug('connect local: %s:%s', self.localAddress, self.localPort)
      }
    })

    self._connecting = false
    self.connected = true

    if (self._chunk) {
      try {
        self.send(self._chunk)
      } catch (err) {
        return self._onError(err)
      }
      self._chunk = null
      self._debug('sent chunk from "write before connect"')

      var cb = self._cb
      self._cb = null
      cb(null)
    }

    self._interval = setInterval(function () {
      if (!self._cb || !self._channel || self._channel.bufferedAmount > self._maxBufferedAmount) return
      self._debug('ending backpressure: bufferedAmount %d', self._channel.bufferedAmount)
      var cb = self._cb
      self._cb = null
      cb(null)
    }, 150)
    if (self._interval.unref) self._interval.unref()

    self._debug('connect')
    self.emit('connect')
  }
}

Peer.prototype._onSignalingStateChange = function () {
  var self = this
  if (self.destroyed) return
  self._debug('signalingStateChange %s', self._pc.signalingState)
  self.emit('signalingStateChange', self._pc.signalingState)
}

Peer.prototype._onIceCandidate = function (event) {
  var self = this
  if (self.destroyed) return
  if (event.candidate && self.trickle) {
    self.emit('signal', {
      candidate: {
        candidate: event.candidate.candidate,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        sdpMid: event.candidate.sdpMid
      }
    })
  } else if (!event.candidate) {
    self._iceComplete = true
    self.emit('_iceComplete')
  }
}

Peer.prototype._onChannelMessage = function (event) {
  var self = this
  if (self.destroyed) return
  var data = event.data
  self._debug('read: %d bytes', data.byteLength || data.length)

  if (data instanceof ArrayBuffer) {
    data = toBuffer(new Uint8Array(data))
    self.push(data)
  } else {
    try {
      data = JSON.parse(data)
    } catch (err) {}
    self.emit('data', data)
  }
}

Peer.prototype._onChannelOpen = function () {
  var self = this
  if (self.connected || self.destroyed) return
  self._debug('on channel open')
  self._channelReady = true
  self._maybeReady()
}

Peer.prototype._onChannelClose = function () {
  var self = this
  if (self.destroyed) return
  self._debug('on channel close')
  self._destroy()
}

Peer.prototype._onAddStream = function (event) {
  var self = this
  if (self.destroyed) return
  self._debug('on add stream')
  self.emit('stream', event.stream)
}

Peer.prototype._onError = function (err) {
  var self = this
  if (self.destroyed) return
  self._debug('error %s', err.message || err)
  self._destroy(err)
}

Peer.prototype._debug = function () {
  var self = this
  var args = [].slice.call(arguments)
  var id = self.channelName && self.channelName.substring(0, 7)
  args[0] = '[' + id + '] ' + args[0]
  debug.apply(null, args)
}

function noop () {}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/simple-peer/index.js","/../../node_modules/simple-peer")
},{"_process":36,"buffer":29,"debug":2,"get-browser-rtc":10,"hat":5,"inherits":6,"is-typedarray":11,"once":13,"stream":50,"typedarray-to-buffer":14}],10:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// originally pulled out of simple-peer

module.exports = function getBrowserRTC () {
  if (typeof window === 'undefined') return null
  var wrtc = {
    RTCPeerConnection: window.mozRTCPeerConnection || window.RTCPeerConnection ||
      window.webkitRTCPeerConnection,
    RTCSessionDescription: window.mozRTCSessionDescription ||
      window.RTCSessionDescription || window.webkitRTCSessionDescription,
    RTCIceCandidate: window.mozRTCIceCandidate || window.RTCIceCandidate ||
      window.webkitRTCIceCandidate
  }
  if (!wrtc.RTCPeerConnection) return null
  return wrtc
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/simple-peer/node_modules/get-browser-rtc/index.js","/../../node_modules/simple-peer/node_modules/get-browser-rtc")
},{"_process":36,"buffer":29}],11:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports      = isTypedArray
isTypedArray.strict = isStrictTypedArray
isTypedArray.loose  = isLooseTypedArray

var toString = Object.prototype.toString
var names = {
    '[object Int8Array]': true
  , '[object Int16Array]': true
  , '[object Int32Array]': true
  , '[object Uint8Array]': true
  , '[object Uint8ClampedArray]': true
  , '[object Uint16Array]': true
  , '[object Uint32Array]': true
  , '[object Float32Array]': true
  , '[object Float64Array]': true
}

function isTypedArray(arr) {
  return (
       isStrictTypedArray(arr)
    || isLooseTypedArray(arr)
  )
}

function isStrictTypedArray(arr) {
  return (
       arr instanceof Int8Array
    || arr instanceof Int16Array
    || arr instanceof Int32Array
    || arr instanceof Uint8Array
    || arr instanceof Uint8ClampedArray
    || arr instanceof Uint16Array
    || arr instanceof Uint32Array
    || arr instanceof Float32Array
    || arr instanceof Float64Array
  )
}

function isLooseTypedArray(arr) {
  return names[toString.call(arr)]
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/simple-peer/node_modules/is-typedarray/index.js","/../../node_modules/simple-peer/node_modules/is-typedarray")
},{"_process":36,"buffer":29}],12:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/simple-peer/node_modules/once/node_modules/wrappy/wrappy.js","/../../node_modules/simple-peer/node_modules/once/node_modules/wrappy")
},{"_process":36,"buffer":29}],13:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var wrappy = require('wrappy')
module.exports = wrappy(once)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/simple-peer/node_modules/once/once.js","/../../node_modules/simple-peer/node_modules/once")
},{"_process":36,"buffer":29,"wrappy":12}],14:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Convert a typed array to a Buffer without a copy
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 * `npm install typedarray-to-buffer`
 */

var isTypedArray = require('is-typedarray').strict

module.exports = function (arr) {
  // If `Buffer` is the browser `buffer` module, and the browser supports typed arrays,
  // then avoid a copy. Otherwise, create a `Buffer` with a copy.
  var constructor = Buffer.TYPED_ARRAY_SUPPORT
    ? Buffer._augment
    : function (arr) { return new Buffer(arr) }

  if (arr instanceof Uint8Array) {
    return constructor(arr)
  } else if (arr instanceof ArrayBuffer) {
    return constructor(new Uint8Array(arr))
  } else if (isTypedArray(arr)) {
    // Use the typed array's underlying ArrayBuffer to back new Buffer. This respects
    // the "view" on the ArrayBuffer, i.e. byteOffset and byteLength. No copy.
    return constructor(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength))
  } else {
    // Unsupported type, just pass it through to the `Buffer` constructor.
    return new Buffer(arr)
  }
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/simple-peer/node_modules/typedarray-to-buffer/index.js","/../../node_modules/simple-peer/node_modules/typedarray-to-buffer")
},{"_process":36,"buffer":29,"is-typedarray":11}],15:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var _global = (function() { return this; })();
var nativeWebSocket = _global.WebSocket || _global.MozWebSocket;
var websocket_version = require('./version');


/**
 * Expose a W3C WebSocket class with just one or two arguments.
 */
function W3CWebSocket(uri, protocols) {
	var native_instance;

	if (protocols) {
		native_instance = new nativeWebSocket(uri, protocols);
	}
	else {
		native_instance = new nativeWebSocket(uri);
	}

	/**
	 * 'native_instance' is an instance of nativeWebSocket (the browser's WebSocket
	 * class). Since it is an Object it will be returned as it is when creating an
	 * instance of W3CWebSocket via 'new W3CWebSocket()'.
	 *
	 * ECMAScript 5: http://bclary.com/2004/11/07/#a-13.2.2
	 */
	return native_instance;
}


/**
 * Module exports.
 */
module.exports = {
    'w3cwebsocket' : nativeWebSocket ? W3CWebSocket : null,
    'version'      : websocket_version
};

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/websocket/lib/browser.js","/../../node_modules/websocket/lib")
},{"./version":16,"_process":36,"buffer":29}],16:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = require('../package.json').version;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/websocket/lib/version.js","/../../node_modules/websocket/lib")
},{"../package.json":17,"_process":36,"buffer":29}],17:[function(require,module,exports){
module.exports={
  "name": "websocket",
  "description": "Websocket Client & Server Library implementing the WebSocket protocol as specified in RFC 6455.",
  "keywords": [
    "websocket",
    "websockets",
    "socket",
    "networking",
    "comet",
    "push",
    "RFC-6455",
    "realtime",
    "server",
    "client"
  ],
  "author": {
    "name": "Brian McKelvey",
    "email": "brian@worlize.com",
    "url": "https://www.worlize.com/"
  },
  "contributors": [
    {
      "name": "Iñaki Baz Castillo",
      "email": "ibc@aliax.net",
      "url": "http://dev.sipdoc.net"
    }
  ],
  "version": "1.0.22",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/theturtle32/WebSocket-Node.git"
  },
  "homepage": "https://github.com/theturtle32/WebSocket-Node",
  "engines": {
    "node": ">=0.8.0"
  },
  "dependencies": {
    "debug": "~2.2.0",
    "nan": "~2.0.5",
    "typedarray-to-buffer": "~3.0.3",
    "yaeti": "~0.0.4"
  },
  "devDependencies": {
    "buffer-equal": "^0.0.1",
    "faucet": "^0.0.1",
    "gulp": "git+https://github.com/gulpjs/gulp.git#4.0",
    "gulp-jshint": "^1.11.2",
    "jshint-stylish": "^1.0.2",
    "tape": "^4.0.1"
  },
  "config": {
    "verbose": false
  },
  "scripts": {
    "install": "(node-gyp rebuild 2> builderror.log) || (exit 0)",
    "test": "faucet test/unit",
    "gulp": "gulp"
  },
  "main": "index",
  "directories": {
    "lib": "./lib"
  },
  "browser": "lib/browser.js",
  "license": "Apache-2.0",
  "gitHead": "19108bbfd7d94a5cd02dbff3495eafee9e901ca4",
  "bugs": {
    "url": "https://github.com/theturtle32/WebSocket-Node/issues"
  },
  "_id": "websocket@1.0.22",
  "_shasum": "8c33e3449f879aaf518297c9744cebf812b9e3d8",
  "_from": "websocket@>=1.0.19 <1.1.0",
  "_npmVersion": "2.14.3",
  "_nodeVersion": "3.3.1",
  "_npmUser": {
    "name": "theturtle32",
    "email": "brian@worlize.com"
  },
  "maintainers": [
    {
      "name": "theturtle32",
      "email": "brian@worlize.com"
    }
  ],
  "dist": {
    "shasum": "8c33e3449f879aaf518297c9744cebf812b9e3d8",
    "tarball": "http://registry.npmjs.org/websocket/-/websocket-1.0.22.tgz"
  },
  "_resolved": "https://registry.npmjs.org/websocket/-/websocket-1.0.22.tgz"
}

},{}],18:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var RTCIceCandidate       = window.mozRTCIceCandidate       || window.webkitRTCIceCandidate       || window.RTCIceCandidate;
var RTCPeerConnection     = window.mozRTCPeerConnection     || window.webkitRTCPeerConnection     || window.RTCPeerConnection;
var RTCSessionDescription = window.mozRTCSessionDescription || window.webkitRTCSessionDescription || window.RTCSessionDescription;

exports.RTCIceCandidate       = RTCIceCandidate;
exports.RTCPeerConnection     = RTCPeerConnection;
exports.RTCSessionDescription = RTCSessionDescription;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/wrtc/lib/browser.js","/../../node_modules/wrtc/lib")
},{"_process":36,"buffer":29}],19:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
* @module src/controllers
* @author Raziel Carvajal-Gomez raziel.carvajal@gmail.com*/
module.exports = ConnectionManager
var debug = typeof window === 'undefined' ? require('debug')('connnection_manager') : require('debug').log
var Connection = require('../services/Connection')
/**
* @class ConnectionManager
* @description Manage the connections with external peers from all the gossip protocols
* running in the local peer.
* @param maxNumOfCon Maximum number of connections*/
function ConnectionManager (maxNumOfCon) {
  if (!(this instanceof ConnectionManager)) return new ConnectionManager(maxNumOfCon)
  this._cons = {}
  this._maxNumOfCon = maxNumOfCon
}
/**
* @method newConnection
* @description Creates a new connection.
* @param receiver End point of the connection
* @param initiator Says weather the local peer initiates or not the creation of the connection
* @param viaSigSer Says weather the connection bootstraps or not via the signaling server*/
ConnectionManager.prototype.newConnection = function (receiver, initiator, viaSigSer) {
  return {
    connection: new Connection(receiver, initiator, viaSigSer),
    conLimReached: Object.keys(this._cons).length === this._maxNumOfCon
  }
}
/**
* @method get
* @description Gets an instance of one connection.
* @param id Connection ID, which coincides with the peer ID of the connection end point*/
ConnectionManager.prototype.get = function (id) { return this._cons[id] !== 'undefined' ? this._cons[id] : null }
/**
* @method set
* @description Replace the instance of one connection with a new one.
* @param c New instance of one connection*/
ConnectionManager.prototype.set = function (c) {
  if (!this._cons[c._receiver]) this._cons[c._receiver] = c
  else debug('Connection with: ' + c._receiver + ' already exists')
}
/**
* @method get Connections
* @description Gets an array of the current connection IDs.
* @return Array Array of connection IDs*/
ConnectionManager.prototype.getConnections = function () { return Object.keys(this._cons) || [] }
/**
* @method deleteOneCon
* @description Delete one connection.*/
ConnectionManager.prototype.deleteOneCon = function () {
  var keys = Object.keys(this._cons)
  debug('DelOneCon before: ' + JSON.stringify(keys))
  debug('DelOneCon called, connection to remove: ' + keys[0])
  this._cons[keys[0]].closeAndAnnounce()
  delete this._cons[keys[0]]
  debug('DelOneCon after:' + JSON.stringify(Object.keys(this._cons)))
  return keys[0]
}
/**
* @method deleteConnection
* @description Delete one particular connection.
* @param id Connection ID to delete*/
ConnectionManager.prototype.deleteConnection = function (id) {
  debug('DelCon before: ' + JSON.stringify(Object.keys(this._cons)))
  this._cons[id].close()
  delete this._cons[id]
  debug('DelCon after: ' + JSON.stringify(Object.keys(this._cons)))
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../src/controllers/ConnectionManager.js","/../../src/controllers")
},{"../services/Connection":22,"_process":36,"buffer":29,"debug":2}],20:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
* @module src/controllers
* @author Raziel Carvajal-Gomez  <raziel.carvajal@gmail.com>*/
module.exports = Coordinator
var debug = typeof window === 'undefined' ? require('debug')('coordinator') : require('debug').log
var its = require('its')
var hat = require('hat')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var GossipUtil = require('../utils/GossipUtil')
var PeerJSProtocol = require('../utils/PeerjsProtocol')
var GossipWrapper = require('../utils/GossipWrapper')
var GossipFactory = require('../services/GossipFactory')
var Bootstrap = require('../services/Bootstrap')
var ConnectionManager = require('../controllers/ConnectionManager')
inherits(Coordinator, EventEmitter)
/**
* @class Coordinator
* @description This class coordinates the execution of a set of gossip-based protocols that
* are defined in the configuration object, see
* [configurationObj]{@link module:src/utils.configurationObj}). This class acts as
* an intermediary between the web application and every gossip protocol that is controlled 
* by one instance of the
* [GossipMediator]{@link module:src/controllers.GossipMediator#setDependencies}, via message
* passing. For instance, if the application requires to show the items in the view of
* the protocol "cyclon1", the Coordinator sends the request to the GossipMediator instance
* of "cyclon1". This class contains a group of methods, which actually form the API of WebGC, 
* to enrich the user's application with a P2P gossip communication.
* @param gossConfObj Configuration object of WebGC see the
* [configurationObj]{@link module:src/utils.configurationObj} for more details.
* @param id Unique identifier of the local peer, if this parameter is not specified one
* random ID will be assigned
* @param profile The content of a user's profile is application dependant, basically, 
* any valid Javascript object is allowed*/
function Coordinator (gossConfObj, id, profile) {
  if (!(this instanceof Coordinator)) return new Coordinator(gossConfObj, id, profile)
  EventEmitter.call(this)
  if (!this._checkConfFile(gossConfObj)) return
  its.defined(gossConfObj.signalingService)
  its.defined(gossConfObj.gossipAlgos)
  its.defined(gossConfObj.statsOpts)
  this._id = id || hat()
  this._sigSerOpts = gossConfObj.signalingService
  this.gossipAlgos = gossConfObj.gossipAlgos
  this.algosNames = Object.keys(this.gossipAlgos)
  this.statsOpts = gossConfObj.statsOpts
  this._usingSs = gossConfObj.usingSs
  if (this.statsOpts.activated) {
    this.actCycHistory = {}
    this.vieUpdHistory = {}
  }
  this._maxNumOfCon = 0
  this.gossipUtil = new GossipUtil(debug)
  this.factory = new GossipFactory(this.gossipUtil, this, gossConfObj.userImplementations, profile || 'undefined')
  try {
    debug('Instantiation of gossip protocols starts')
    this.factory.createProtocols(this.gossipAlgos, this.statsOpts)
    debug('Instantiation of gossip protocols is finished')
  } catch (e) {
    debug('During the instantiation of gossip protocols. ' + e)
  }
  this._connectionManager = new ConnectionManager(this._maxNumOfCon)
  this._algosPool = {}
  this._routingTable = {}
  this._extendAttributes()
}
/**
 * @method _extendAttributes
 * @description
 * @param
 */
Coordinator.prototype._extendAttributes = function() {
  this.protocols = {}
  for (var i = 0; i < this.algosNames.length; i ++) {
    this.protocols[this.algosNames[i]] = new GossipWrapper(this, this.algosNames[i], this._id)
  }
}
/**
 * @method _delItemInViews
 * @description
 * @param
 */
Coordinator.prototype._delItemInViews = function (id) {
  for (var i = 0; i < this.algosNames.length; i++) {
    this.workers[this.algosNames[i]].postMessage({ header: 'delete', item: id })
  }
}
/**
* @memberof Coordinator
* @method checkConfFile
* @description The evaluation for knowing if the
* [configuration file]{@link module:src/confObjs#configurationObj} is well structured is performed
* by this method
* @param confObj Configuration object*/
Coordinator.prototype._checkConfFile = function (confObj) {
  debug('Checking if configuration file is well formed')
  its.defined(confObj.signalingService.host, "Host server isn't defined")
  its.string(confObj.signalingService.host, "Host server isn't a string")
  its.defined(confObj.signalingService.port, "Port server isn't defined")
  its.number(confObj.signalingService.port, "Port server isn't a number")
  var keys = Object.keys(confObj.gossipAlgos)
  for (var i = 0; i < keys.length; i++) {
    its.defined(confObj.gossipAlgos[keys[i]].class, "Class type of the protocol isn't defined")
  }
  debug('Configuration file is well formed')
  return true
}
/**
* @memberof Coordinator
* @method start
* @description Basically, this method instantiates: i) the [Peer]{@link http://peerjs.com/docs/#api}
* object, ii) the LookupService (if it is
* specified in the configuration object) and iii) every implementation of the gossip algorithms. In point
* iii one [web worker]{@link http://www.w3schools.com/html/html5_webworkers.asp} environment is created
* per algorithm with an instance of a [GossipMediator]{@link module:src/controllers#GossipMediator} too.
* Additionally, events of [Peer]{@link http://peerjs.com/docs/#api} are set to receive messages of
* external peers.*/
Coordinator.prototype.bootstrap = function () {
  this._sigSer = new PeerJSProtocol(this._id, this._sigSerOpts.host, this._sigSerOpts.port)
  var self = this
  this._sigSer.on('open', function () {
    self._bootSer = new Bootstrap(self._id, self._sigSerOpts.host, self._sigSerOpts.port)
    self._bootSer.on('boot', function (respToBoot) {
      var firstView = []
      if (respToBoot.peer !== 'undefined') {
        var c = self._connectionManager.newConnection(respToBoot.peer, true, true).connection
        self._initConnectionEvents(c)
        self._connectionManager.set(c)
        firstView.push(respToBoot.peer)
      } else debug('I am the first peer in the overlay, eventually other peer will contact me')
      var worker, period
      for (var i = 0; i < self.algosNames.length; i++) {
        worker = self.workers[self.algosNames[i]]
        worker.postMessage({ header: 'firstView', view: firstView })
        period = self.gossipAlgos[self.algosNames[i]].gossipPeriod
        self._bootGossipCycle(self.algosNames[i], worker, period)
      }
    })
    self._bootSer.getPeerToBootstrap()
  })
  this._sigSer.on('idTaken', function () {
    // TODO Coordinator must implement this event if WebGC is open to the public where
    // the peerID must be generated in a random way (via the 'hat' library for instance)
    // avoiding that two peers have the same identifier. Call: self.emit('resetPeerId')
  })
  this._sigSer.on('abort', function () { /* TODO handle as exception */ })
  this._sigSer.on('getFirstPeer', function () {
    // TODO Again these two method must be implemented if WebGC is open to the public
    // self.emit('removeAllConnections') && self._getPeerToBootstrap()
  })
  this._sigSer.on('offer', function (src, payload) {
    var cO = self._connectionManager.newConnection(src, false, true)
    if (cO.conLimReached) {
      var toDel = self._connectionManager.deleteOneCon()
      if (!self._usingSs) self._delItemInViews(toDel)
    }
    self._initConnectionEvents(cO.connection)
    self._connectionManager.set(cO.connection)
    cO.connection._peer.signal(payload)
  })
  this._sigSer.on('answer', function (src, payload) {
    var cA = self._connectionManager.get(src)
    if (cA) cA._peer.signal(payload)
    else debug('SDP.sigSer.answer received without having one connection with: ' + src)
  })
  this._sigSer.on('candidate', function (src, payload) {
    var cC = self._connectionManager.get(src)
    if (cC) cC._peer.signal(payload)
    else debug('SDP.sigSer.candidate received without having one connection with: ' + src)
  })
  this._sigSer.on('abort', function () { debug('Abort.sigSer was called') })
}
/**
 * @method _bootGossipCycle
 * @description
 * @param
 */
Coordinator.prototype._bootGossipCycle = function (algoId, worker, period) {
  this._algosPool[algoId] = setInterval(function () {
    worker.postMessage({header: 'gossipLoop'})
  }, period)
}
/**
 * @method _initConnectionEvents
 * @description
 * @param
 */
Coordinator.prototype._initConnectionEvents = function (c) {
  if (!c) return
  var self = this
  c.on('open', function () {
    if (Object.keys(self._routingTable).indexOf(c._receiver, 0) !== -1) delete self._routingTable[c._receiver]
  })
  c.on('sdp', function (sdp) {
    if (c._usingSigSer) {
      debug('Sending SDP through the server')
      self._sigSer.sendSDP(sdp, c._receiver)
    } else {
      debug('Sending SDP via DataConnections')
      var proxy = self._routingTable[c._receiver]
      var proxyCon = self._connectionManager.get(proxy)
      if (proxyCon) {
        var type = typeof sdp.type !== 'undefined' ? sdp.type.toUpperCase() : 'CANDIDATE'
        proxyCon.send({
          service: 'SDP',
          emitter: self._id,
          receiver: c._receiver,
          payload: { 'type': type, 'payload': sdp}
        })
      } else debug('No proxy, why?')// TODO What to do if proxy is absent ?
    }
  })
  c.on('msgReception', function (msg) { self.handleIncomingData(msg, c._receiver) })
}
/**
* @memberof Coordinator
* @method setWorkerEvents
* @description This method sets the event "message" of a web worker for handling any message exchange
* in WebGC. These are the possible message exchanges: i) from the Coordinator to an external peer, ii)
* from one worker to another one via the Coordinator and iii) from the Coordinator to a web application
* @param worker Reference to a [web worker]{@link http://www.w3schools.com/html/html5_webworkers.asp}*/
Coordinator.prototype.setWorkerEvents = function (worker, algoId) {
  debug('Setting events of worker ' + algoId)
  var self = this
  worker.addEventListener('message', function (e) {
    var msg = e.data
    var worker
    switch (msg.header) {
      case 'outgoingMsg':
        debug('OutgoingMsg to reach: ' + msg.receiver)
        if (msg.header) {
          delete msg.header
          var c = self._connectionManager.get(msg.receiver)
          if (!c) {
            debug('Connection with: ' + msg.receiver + ' does not exist, doing connection')
            c = self._connectionManager.newConnection(msg.receiver, true, self._usingSs)
            if (c.conLimReached) {
              var toDel = self._connectionManager.deleteOneCon()
              if (!self._usingSs) {
                self._delItemInViews(toDel)
                delete self._routingTable[toDel]
              }
            }
            self._initConnectionEvents(c.connection)
            self._connectionManager.set(c.connection)
            c.connection.send(msg)
          } else { c.send(msg) }
        } else { debug('Receiver is null. Msg: ' + JSON.stringify(msg)) }
        break
      case 'getDep':
        worker = self.workers[msg.depId]
        if (worker !== 'undefined') worker.postMessage(msg)
        else debug('there is not a worker for algorithm: ' + msg.depId)
        break
      case 'setDep':
        worker = self.workers[msg.emitter]
        if (worker !== 'undefined') {
          msg.header = 'applyDep'
          worker.postMessage(msg)
        } else debug('there is not a worker for algorithm: ' + msg.emitter)
        break
      // TODO this method must be implemented out of the Coordinator cause the draw of
      // each gossip protocol must be performed by the Plotter obj; to do that, the
      // main thread must ask the view of each protocol in a periodic way
      // case 'drawGraph':
      //   if (typeof self.plotterObj !== 'undefined') {
      //     self.plotterObj.buildGraph(msg.algoId, msg.graph, msg.view)
      //   } else debug(msg)
      //   break
      case 'actCycLog':
        if (self.actCycHistory)
          self.actCycHistory[msg.algoId][msg.counter] = { algoId: msg.algoId, loop: msg.loop, offset: msg.offset }
        break
      case 'viewUpdsLog':
        if (self.statsOpts.activated) self.vieUpdHistory[msg.trace.algoId][msg.counter] = msg.trace
        break
      case 'logInConsole':
        debug(msg.log)
        break
      case 'neigs':
        debug('Neighbourhood of thread ' + msg.algoId + ': ' + msg.view)
        self.emit('neighbourhood', msg.view, msg.algoId, msg.loop)
        break
      default:
        debug('message: ' + msg.header + ' is not recoginized')
        break
    }
  }, false)
  worker.addEventListener('error', function (e) {
    debug('In Worker:' + e.message + ', lineno:' + e.lineno)
    debug(JSON.stringify(e))
  }, false)
}
/**
* @memberof Coordinator
* @method getViewUpdHistory
* @description Get statistics about to which extend the view of algorithms is updated
* @return Object Keys in this object correspond to the number of each gossip cycle*/
Coordinator.prototype.getViewUpdHistory = function () { return this.vieUpdHistory }
/**
* @memberof Coordinator
* @method getActiCycHistory
* @description Get statistics about to which extend the gossip cycle is updated on
* each algorithm
* @return Object Keys in this object correspond to the number each gossip cycle*/
Coordinator.prototype.getActiCycHistory = function () { return this.actCycHistory }
/**
* @memberof Coordinator
* @method emptyHistoryOfLogs
* @description Once this method is called every key of the objects "vieUpdHistory" and "actCycHistory"
* points to an empty object*/
Coordinator.prototype.emptyHistoryOfLogs = function () {
  var i
  var keys = Object.keys(this.vieUpdHistory)
  for (i = 0; i < keys.length; i++) {
    delete this.vieUpdHistory[ keys[i] ]
    this.vieUpdHistory[ keys[i] ] = {}
  }
  keys = Object.keys(this.actCycHistory)
  for (i = 0; i < keys.length; i++) {
    delete this.actCycHistory[ keys[i] ]
    this.actCycHistory[ keys[i] ] = {}
  }
}
/**
* @memberof Coordinator
* @method handleIncomingData
* @description Every message received by peers contains one header to differentiate its payload,
* this method handles the reception of messages according to the next two headers: gossip and
* lookup. The latter serves to discover peers in the overlay and the former contains what it is
* exchanged by each gossip protocol (normally, the view of each peer).
* @param data Message exchange between two peers*/
Coordinator.prototype.handleIncomingData = function (data, emitter) {
  debug('Msg reception in DataChannel: ' + data.service)
  switch (data.service) {
    case 'SDP':
      if (data.receiver === this._id) {
        this._routingTable[data.emitter] = emitter
        switch (data.payload.type) {
          case 'OFFER':
            var cO = this._connectionManager.newConnection(data.emitter, false, this._usingSs)
            if (cO.conLimReached) {
              var toDel = this._connectionManager.deleteOneCon()
              if (!this._usingSs) {
                this._delItemInViews(toDel)
                delete this._routingTable[toDel]
              }
            }
            this._initConnectionEvents(cO.connection)
            this._connectionManager.set(cO.connection)
            cO.connection._peer.signal(data.payload.payload)
            break
          case 'ANSWER':
            var cA = this._connectionManager.get(data.emitter)
            if (cA) cA._peer.signal(data.payload.payload)
            else debug('DataChannel.SDP.answ received without having a connection with: ' + data.emitter)
            break
          case 'CANDIDATE':
            var cC = this._connectionManager.get(data.emitter)
            if (cC) cC._peer.signal(data.payload.payload)
            else debug('DataChannel.SDP.candi received without having a connection with: ' + data.emitter)
            break
          default:
            debug('SDP in DataChannel unknown: ' + data.service)
            break
        }
      } else {
        var c = this._connectionManager.get(data.receiver)
        if (c) {
          debug('Forward msg to reach: ' + data.receiver)
          c.send(data)
        } else {
          // TODO cope with the LEAVE message in SDP
        }
      }
      break
    case 'GOSSIP-PUSH':
      var incomingLog = 'INCOMING MSG: ' + data.algoId + '_' + emitter + '_' + data.receiver + '_' +
        JSON.stringify(data.payload)
      debug(incomingLog)
      this._updRoutingTable(Object.keys(data.payload), emitter)
      var worker = this.workers[data.algoId]
      var msg = {
        header: 'gossipPushRec',
        payload: data.payload,
        receptionTime: new Date(),
        'emitter': emitter
      }
      worker.postMessage(msg)
      break
    case 'GOSSIP-PULL':
      var wo = this.workers[data.algoId]
      var ms = {
        header: 'gossipPullRec',
        payload: data.payload,
        'emitter': emitter
      }
      wo.postMessage(ms)
      break
    case 'LEAVE':
      this._connectionManager.deleteConnection(emitter)
      if (!this._usingSs) {
        this._delItemInViews(emitter)
        delete this._routingTable[emitter]
      }
      break
    case 'APPLICATION':
      this.emit('msgReception', data.emitter, data.payload)
      break
    default:
      debug(data + ' is not recognized')
      break
  }
}
/**
 * @method _updRoutingTable
 * @description
 * @param
 */
Coordinator.prototype._updRoutingTable = function (view, emitter) {
  for (var i = 0; i < view.length; i++) {
    if (view[i] !== emitter) this._routingTable[view[i]] = emitter
  }
}
/**
 * @method updateProfile
 * @description
 * @param
 */
Coordinator.prototype.updateProfile = function (newProfile) {
  for (var i = 0; i < this.algosNames.length; i ++) {
    this.workers[this.algosNames[i]].postMessage({ header: 'updateProfile', profile: newProfile })
  }
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../src/controllers/Coordinator.js","/../../src/controllers")
},{"../controllers/ConnectionManager":19,"../services/Bootstrap":21,"../services/GossipFactory":23,"../utils/GossipUtil":"/../../src/utils/GossipUtil.js","../utils/GossipWrapper":24,"../utils/PeerjsProtocol":25,"_process":36,"buffer":29,"debug":2,"events":33,"hat":5,"inherits":6,"its":7}],21:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
* @module src/services*/
module.exports = Bootstrap
var debug, XMLHttpRequest
if (typeof window === 'undefined') {
  debug = require('debug')('bootstrap')
  XMLHttpRequest = require('xhr2')
} else {
  debug = require('debug').log
  XMLHttpRequest = window.XMLHttpRequest
}
var inherits = require('inherits')
var its = require('its')
var EventEmitter = require('events').EventEmitter
var TIMES_TO_RECONECT = 3
inherits(Bootstrap, EventEmitter)
/**
* @class Bootstrap
* @description For being able to join an overlay peers must receive at least one reference of
* another peer (already in the overlay) to communicate with, most of the methods in this class
* communicate with one server which will provide a list of peers to bootstrap the exchange of gossip
* messages. The bootstrap procedure works as follows: first of all, peers post its local profile
* that is the payload contained in every gossip message then, peers request the reference of
* another peer to perform a connection with it via the
* [brokering server]{@link https://github.com/peers/peerjs-server}, finally, peers request a list
* of peer references which will initialize every view of the gossip protocols (see attribute view
* of [GossipProtocol]{@link module:src/superObjs#GossipProtocol}).
* @param coordi Reference to the [Coordinator]{@link module:src/controllers#Coordinator}
* @author Raziel Carvajal-Gomez <raziel.carvajal@gmail.com>*/
function Bootstrap (peerId, host, port) {
  if (!(this instanceof Bootstrap)) return new Bootstrap(peerId, host, port)
  its.string(peerId)
  its.string(host)
  its.number(port)
  EventEmitter.call(this)
  this._id = peerId
  this._serverOpts = {'host': host, 'port': port}
  this._reconnectionTime = 3000
  this._tries = 0
  this._url = 'http://' + host + ':' + port + '/webgc'
}
/**
* @memberof Bootstrap
* @method postProfile
* @description Post in the [brokering server]{@link https://github.com/peers/peerjs-server} the
* peer's profile, which is the payload to exchange on each gossip message.*/
Bootstrap.prototype.getPeerToBootstrap = function () {
  debug('Connection success with signaling server, getting first peer to bootstrap')
  var xhr = new XMLHttpRequest()
  var url = this._url + '/' + this._id + '/peerToBoot'
  xhr.open('GET', url, true)
  var self = this
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return
    if (xhr.status !== 200) {
      xhr.onerror()
      return
    }
    var resp = JSON.parse(xhr.responseText)
    debug('Peer to boot is: ' + xhr.responseText)
    // when the peer to bootstrap isn't defined, it means that the local
    // peer is the first peer to contact the server which means that eventually
    // the local peer will be contacted by another peer
    if (resp.peer !== 'undefined') its.string(resp.peer)
    // if (resp.peer !== 'undefined') {
    //   its.string(resp.peer)
    //   its.string(resp.profile)
    //   var ar = resp.profile.split('_')
    //   debug(JSON.stringify(ar))
    //   resp.profile = {}
    //   for (var i = 0; i < ar.length; i = i + 2) {
    //     resp.profile[ar[i]] = []
    //     var items = ar[i+1].split('-')
    //     for (var j = 0; j < items.length; j++) {
    //       resp.profile[ar[i]].push(items[j])
    //     }
    //   }
    // }
    self.emit('boot', resp)
  }
  xhr.onerror = function () {
    self._tries++
    debug('Error while getting first peer to bootstrap, scheduling another request')
    if (self._tries <= TIMES_TO_RECONECT) {
      setTimeout(self._getPeerToBootstrap, 3000)
    } else {
      debug('Too many erros during interaction with server, aborting')
      self.emit('abort')
    }
  }
  xhr.send(null)
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../src/services/Bootstrap.js","/../../src/services")
},{"_process":36,"buffer":29,"debug":2,"events":33,"inherits":6,"its":7,"xhr2":27}],22:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = Connection
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var Peer = require('simple-peer')
var debug
if (typeof window === 'undefined') {
  var wrtc = require('wrtc')
  debug = require('debug')('connection')
} else debug = require('debug').log
inherits(Connection, EventEmitter)

function Connection (receiver, initiator, usingSigSer) {
  if (!(this instanceof Connection)) return new Connection(receiver, initiator, usingSigSer)
  EventEmitter.call(this)
  this._receiver = receiver
  this._initiator = initiator
  this._usingSigSer = usingSigSer
  this._isOpen = false
  this._msgsQueue = []
  this._peer = new Peer({
    'initiator': initiator,
    'config': { iceServers: [
        //{ url: 'stun:23.21.150.121'}, 
        {urls:'stun:stun.l.google.com:19302'},
        {urls:'stun:stun1.l.google.com:19302'},
    ]},
    'wrtc': typeof window === 'undefined' ? wrtc : false
  })
  var self = this
  this._peer.on('connect', function () {
    self._isOpen = true
    debug('Connection with: ' + self._receiver + ' is open')
    for (var i = 0; i < self._msgsQueue.length; i++) self._peer.send(self._msgsQueue[i])
    self._msgsQueue = []
    if (!self._usingSigSer) self.emit('open')
  })
  this._peer.on('signal', function (data) {
    debug('SDP: [' + Object.keys(data) + '] to exchange with: ' + self._receiver)
    self.emit('sdp', data)
  })
  this._peer.on('data', function (data) {
    debug('Message: ' + data.service + ' received from: ' + self._receiver)
    self.emit('msgReception', data)
  })
  this._peer.on('error', function (err) {debug('Connection error with: ' + self._receiver + '. ' + err)})
}

Connection.prototype.send = function (msg) {
  if (!this._isOpen) {
    debug('Connection with peer: ' + this._receiver + "isn't open, enqueueing msg")
    this._msgsQueue.push(msg)
  } else {
    debug('Sending message to: ' + this._receiver)
    this._peer.send(msg)
  }
}

Connection.prototype.closeAndAnnounce = function () {
  this.send({service: 'LEAVE'})
  this._peer.destroy()
}

Connection.prototype.close = function () {
  debug('Connection with: ' + this._receiver + ' is closed')
  this._peer.destroy()
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../src/services/Connection.js","/../../src/services")
},{"_process":36,"buffer":29,"debug":2,"events":33,"inherits":6,"simple-peer":9,"wrtc":18}],23:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
* @module src/services*/
module.exports = GossipFactory
var inNodeJS = typeof window === 'undefined'
var its = require('its')
var debug, Worker, fs, Blob, Threads
if (inNodeJS) {
  // TODO test if Threads could be used to avoid writing files in the directory src/workers
  fs = require('fs')
  debug = require('debug')('factory')
  Threads = require('webworker-threads')
  Worker = Threads.Worker
} else {
  debug = require('debug').log
  Worker = window.Worker
  if (typeof Worker === 'undefined') throw new Error('Your browser does not support web-workers')
  window.URL = window.URL || window.webkitURL
  Blob = window.Blob
}
/**
* @class GossipFactory
* @description Implementation of the
* [factory pattern]{@link http://en.wikipedia.org/wiki/Factory_method_pattern} to create
* instances of gossip protocols, the settings of each protocol are defined in
* [the configuration object]{@link module:src/confObjs#configurationObj}. Given that
* the computation of gossip cycles could takes considerable time, each gossip protocol will be instantiated
* in the context of a [web worker]{@link http://www.w3schools.com/html/html5_webworkers.asp} in that way
* it is expected to avoid freezing the main thread of JavaScript.
* @param opts Object with one [logger]{@link module:src/utils#LoggerForWebWorker} and with one reference
* to a [GossipUtil]{@link module:src/utils#GossipUtil} object.
* @author Raziel Carvajal-Gomez <raziel.carvajal@gmail.com>*/
function GossipFactory (gossipUtil, coordi, userImpls, profile) {
  if (!(this instanceof GossipFactory)) return new GossipFactory(gossipUtil, coordi, userImpls, profile)
  this.gossipUtil = gossipUtil
  this._coordinator = coordi
  this._userImpls = userImpls
  this._profile = profile
  this.inventory = {}
  this._algosDB = {}
  this._clsCodeWebworkerComp = {}
  this._workerLibs = {}
  if (inNodeJS) this._origin = __filename.split('services/GossipFactory.js')[0]
  else this._origin = window.location.href.split('peerjs-gossip')[0] + 'peerjs-gossip/src/'
  debug('Origin: ' + this._origin)
  this._webWorkerCls = [ 
    'utils/GossipUtil.js', 'superObjs/GossipProtocol.js',
    'superObjs/ViewSelector.js', 'controllers/GossipMediator.js',
    'utils/Profile.js'
  ]
  var algosImpl = this.gossipUtil._algorithmsDb
  for (var i = 0; i < algosImpl.length; i++) this._webWorkerCls.push(algosImpl[i])
  this._makeClsWebworkCompatible(this._webWorkerCls, true)
  this._makeClsWebworkCompatible(userImpls, false)
}
GossipFactory.prototype._makeClsWebworkCompatible = function (clsSrc, withPath) {
  var splitted, cls, code
  var path = withPath ? ( inNodeJS ? this._origin : '/../../src/' ) : ''
  try { 
    for (var i = 0; i < clsSrc.length; i++) {
      splitted = clsSrc[i].split('/') 
      cls = splitted[splitted.length - 1].split('.')[0]
      this._algosDB[cls] = require(path + clsSrc[i])
      debug('making ' + cls + ' web-worker compatible')
      code = this._turnIntoWebworkerClass(this._algosDB[cls], cls)
      debug('Done with ' + cls)
      this._clsCodeWebworkerComp[cls] = code
    }
  } catch(e) {
    debug('While making ' + cls + ' web-worker compatible. Error: ' + e)
  }
}
GossipFactory.prototype._turnIntoWebworkerClass = function (obj, clsName) {
  var methods = Object.keys(obj.prototype)
  var webworkerClass = '(function (exports) {\n'
  webworkerClass += obj.prototype['constructor'].toString() + '\n'
  for (var i = 0; i < methods.length; i++) {
    webworkerClass += clsName + '.prototype.' + methods[i] + ' = ' + obj.prototype[methods[i]].toString() + '\n'
  }
  webworkerClass += 'exports.' + clsName + ' = ' + clsName + '\n'
  webworkerClass += '}) (this)'
  return webworkerClass
}
GossipFactory.prototype._writeWorkers = function(workerLib) {
  var workerPath = this._origin + 'workers/' + workerLib + '.js'
  fs.writeFileSync(workerPath, this._clsCodeWebworkerComp[workerLib])
  if (!fs.existsSync(workerPath)) throw Error('While making ' + file + ' run in web-worker context')
  debug('File ' + workerLib + ' could be run in a web-worker context')
  this._workerLibs[workerLib] = workerPath
}
GossipFactory.prototype._loadWorkers = function(workerLib) {
  var blob = new Blob([this._clsCodeWebworkerComp[workerLib]], {type: 'text/javascript'})
  var blobUrl = window.URL.createObjectURL(blob)
  this._workerLibs[workerLib] = blobUrl
}
GossipFactory.prototype._createWorkerLibs = function () {
  var workerLib
  var loadOp = inNodeJS ? '_writeWorkers' : '_loadWorkers'
  for (var i = 0; i < this._webWorkerCls.length; i++) {
    workerLib = this._webWorkerCls[i].split('/')[1].split('.')[0]
    debug('writing ' + workerLib)
    this[loadOp](workerLib)
  }
}
GossipFactory.prototype.createProtocols = function (gossipObj, statsOpts) {
  this._createWorkerLibs()
  var algOpts
  var algosIds = Object.keys(gossipObj)
  for (var i = 0; i < algosIds.length; i++) {
    algOpts = gossipObj[ algosIds[i] ]
    this._coordinator._maxNumOfCon += algOpts.viewSize
    if (statsOpts.activated) {
      this._coordinator.actCycHistory[ algosIds[i] ] = {}
      this._coordinator.vieUpdHistory[ algosIds[i] ] = {}
    }
    this._createProtocol(algosIds[i], algOpts, statsOpts)
    this._coordinator.setWorkerEvents(this.inventory[ algosIds[i] ], algosIds[i])
  }
  this._coordinator.workers = this.inventory
}
/**
* @memberof GossipFactory
* @method createProtocol
* @description Creates an instance of one gossip protocol, the reference of the protocol will be kept
* in the local attribute "inventory" identified by a unique ID.
* @param algoId Unique identifier of one gossip protocol
* @param algOpts Object with the attributes of one gossip protocol*/
GossipFactory.prototype._createProtocol = function (algoId, algOpts, statsOpts) {
  debug('Checking if gossip algorithms are available')
  try {
    its.string(algOpts.class)
    var cls = this._algosDB[algOpts.class]
    if (typeof cls === 'undefined') throw new Error('Algorithm: ' + algOpts.class + ' is not in WebGC')
    this.gossipUtil.extendProperties(algOpts, cls.defaultOpts)
    this.checkProperties(algOpts)
    this.gossipUtil.extendProperties(algOpts, {'algoId': algoId, peerId: this._coordinator._id})
    var opts = {
      activated: statsOpts.activated,
      feedbackPeriod: statsOpts.feedbackPeriod,
      header: algOpts.class
    }
    if (!this.inventory[algoId]) {
      var fP
      var code = this._buildWorkerHeader(algoId, algOpts.class, opts.activated, algOpts)
      if (inNodeJS) {
        fP = this._origin + 'workers/' + algoId + '_' + this._coordinator._id + '.js'
        fs.writeFileSync(fP, code)
        if (!fs.existsSync(fP)) throw new Error('While creating worker file')
      } else {
        var blob = new Blob([code], {type: 'text/javascript'})
        fP = window.URL.createObjectURL(blob)
      }
      this.inventory[algoId] = new Worker(fP)
      debug('Worker ' + algoId + ' was created')
    } else throw new Error("The Object's identifier (" + algoId + ') already exists')
  } catch (e) {
    debug(e)
  }
}
/**
* @memberof GossipFactory
* @method checkProperties
* @description Verifies if the attributes in a
* [configuration object]{@link module:src/confObjs#configurationObj} have the correct type as well as
* the minimal value.
* @param opts Object with the attributes of one gossip protocol*/
GossipFactory.prototype.checkProperties = function (opts) {
  its.number(opts.viewSize)
  its.range(opts.viewSize > 1)
  its.number(opts.fanout)
  its.range(opts.fanout > 1)
  its.number(opts.periodTimeOut)
  its.range(opts.periodTimeOut >= 2000)
  its.boolean(opts.propagationPolicy.push)
  its.boolean(opts.propagationPolicy.pull)
}
GossipFactory.prototype._buildWorkerHeader = function (algoId, algoClass, statsActiv, algOpts) {
  var file, i
  var code = 'var isLogActivated = ' + statsActiv + '\n'
  if (inNodeJS) code += "var debug = console.log\ndebug('Worker initialization')\n"
  else code += "var debug = function (msg) {}\ndebug('Worker initialization')\n"
  var libs = Object.keys(this._workerLibs)
  for (i = 0; i < libs.length; i++) {
    code += "importScripts('" + this._workerLibs[ libs[i] ] + "')\n"
    code += "debug('import of " + libs[i] + " is DONE')\n"
  }
  if (libs.indexOf(algoClass, 0) !== -1) debug('File to import exists')
  else throw new Error('Worker library ' + algoClass + ' do not exists')
  code += "importScripts('" + this._workerLibs[algoClass] + "')\n"
  var keysWithFunc = this.searchFunctions(algOpts)
  if (keysWithFunc.length > 0) {
    for (i = 0; i < keysWithFunc.length; i++) algOpts[ keysWithFunc[i] ] = String(algOpts[ keysWithFunc[i] ])
  }
  code += 'var algOpts = ' + JSON.stringify(algOpts) + '\n'
  for (i = 0; i < keysWithFunc.length; i++) {
    code += "algOpts['" + keysWithFunc[i] + "'] = " + algOpts[ keysWithFunc[i]] + '\n'
  }
  code += "debug('Worker initialization BEGINS')\n"
  code += 'var gossipUtil = new GossipUtil(debug)\n'
  code += 'var payload = ' + JSON.stringify(this._profile) + '\n'
  code += 'var profile = new Profile(payload)\n'
  code += 'var algo = new ' + algoClass + '(algOpts, debug, gossipUtil, isLogActivated, profile)\n'
  code += 'var mediator = new GossipMediator(algo, this, debug)\n'
  code += 'algo.setMediator(mediator)\n'
  code += 'mediator.listen()\n'
  code += "debug('Worker initialization DONE')"
  return code
}
/**
* @memberof GossipFactory
* @method searchFunctions
* @description Search the attributes of functions from one object
* @param obj Functions will be search in this object
* @return Array Keys of the object that points to functions*/
GossipFactory.prototype.searchFunctions = function (obj) {
  var keys = Object.keys(obj)
  var keysWithFunc = []
  for (var i = 0; i < keys.length; i++) {
    if (typeof obj[ keys[i] ] === 'function') { keysWithFunc.push(keys[i]) }
  }
  return keysWithFunc
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../src/services/GossipFactory.js","/../../src/services")
},{"_process":36,"buffer":29,"debug":2,"fs":27,"its":7,"webworker-threads":27}],24:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = GossipWrapper
var its = require('its')
var debug = typeof window === 'undefined' ? require('debug')('gossip-wrapper') : require('debug').log

function GossipWrapper (coordinator, algoId, id) {
  if (!(this instanceof GossipWrapper)) return new GossipWrapper(coordinator, algoId, id)
  this._coordi = coordinator
  this._algoId = algoId
  this._id = id
}
GossipWrapper.prototype.setNeighbourhoodSize = function (n) {
  its.number(n, 'Neighbourhood new size is not a number')
  its.range(n >= 1, 'Neighbourhood new size must be at least bigger then one')
  var fanout = this._coordi.gossipAlgos[this._algoId].fanout
  its.range(n > fanout, 'Neighbourhood new size must be bigger than ' + fanout +
    ', which it is the fanout value of the algorithm ' + this._algoId)
  var connections = this._coordi._connectionManager.getConnections()
  var toRemove = []
  if (connections.length > n) {
    for (var i = 0; i < connections.length - n; i++) {
      toRemove.push(connections[i])
      this._coordi._connectionManager.deleteConnection(connections[i])
    }
  }
  debug('Next connections will be removed: ' + toRemove)
  this._coordi.workers[this._algoId].postMessage({ header: 'deleteViewItems', items: toRemove, newSize: n })
  this._coordi._connectionManager._maxNumOfCon = n
  debug('New neighbourhood size: ' + n)
}
GossipWrapper.prototype.getNeighbourhood = function () {
  this._coordi.workers[this._algoId].postMessage({header: 'getNeighbourhood'})
  debug('Get neighbourhood request was sent to thread: ' + this._algoId)
}
GossipWrapper.prototype.sendTo = function (neighbour, payload) {
  if (payload === undefined || payload === '') {
    debug('Message is empty or void')
    return
  }
  var connection = this._coordi._connectionManager.get(neighbour)
  if (!connection) {
    debug('There is no connection with: ' + neighbour)
    return
  }
  var msg = { service: 'APPLICATION', 'payload': payload, emitter: this._id }
  connection.send(msg)
}
GossipWrapper.prototype.sendToNeighbours = function(payload) {
  if (payload === undefined || payload === '') {
    debug('Message is empty or void')
    return
  }
  var connections = this._coordi._connectionManager.getConnections()
  if (connections.length === 0) {
    debug('There is no connection with others peers')
    return
  } else {
    for (var i = 0; i < connections.length; i++) this.sendTo(connections[i], payload)
  }
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../src/utils/GossipWrapper.js","/../../src/utils")
},{"_process":36,"buffer":29,"debug":2,"its":7}],25:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = PeerJSProtocol
var debug
if (typeof window === 'undefined') debug = require('debug')('peerJSproto')
else debug = require('debug').log
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var Socket = require('./Socket')
inherits(PeerJSProtocol, EventEmitter)

function PeerJSProtocol (peerId, host, port) {
  if (!(this instanceof PeerJSProtocol)) return new PeerJSProtocol(peerId, host, port)
  EventEmitter.call(this)
  this._id = peerId
  this._open = false
  this.socket = new Socket(peerId, host, port)
  var self = this
  this.socket.on('message', function (msg) { self._handleMessage(msg) })
  this.socket.on('close', function () { self.socket.close() })
}

PeerJSProtocol.prototype._handleMessage = function (msg) {
  switch (msg.type) {
    case 'OPEN':
      this._open = true
      debug('Connection with signaling server is done')
      this.emit('open')
      break
    case 'ERROR':
      debug('Error msg from server: ?')
      break
    case 'ID_TAKEN':
      debug('Chosing another PeerID')
      this.emit('idTaken')
      break
    case 'INVALID_KEY':
      debug("Key for WebGC isn't valid, aborting")
      this.emit('abort')
      break
    case 'LEAVE':
      // TODO check if this message could be useful with the use of simple-peer.
      // Normally, this LEAVE announcement must be performed in a DataChannel
      // between two peers
      debug('PeerJS.LEAVE msg is received, why?')
      break
    case 'EXPIRE':
      // PeerJS: The offer sent to a peer has expired without response.
      debug('Probably peer to bootstrap is down, getting another one')
      this.emit('getFirstPeer')
      break
    case 'OFFER':
      debug('Offer received from: ' + msg.src)
      this.emit('offer', msg.src, msg.payload)
      break
    case 'ANSWER':
      debug('Answer received from: ' + msg.src)
      this.emit('answer', msg.src, msg.payload)
      break
    case 'CANDIDATE':
      debug('Candidate received from: ' + msg.src)
      this.emit('candidate', msg.src, msg.payload)
      break
    default:
      debug("Message isn't in the PeerJS protocol")
      break
  }
}

PeerJSProtocol.prototype.destroy = function () { this.socket.close() }

PeerJSProtocol.prototype.sendSDP = function (sdp, receiver) {
  var type = typeof sdp.type !== 'undefined' ? sdp.type.toUpperCase() : 'CANDIDATE'
  if (this._open) this.socket.send({'type': type, dst: receiver, payload: sdp})
  else debug('Socket is closed. SDP: ' + type + 'will not be transmitted to: ' + receiver)
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../src/utils/PeerjsProtocol.js","/../../src/utils")
},{"./Socket":26,"_process":36,"buffer":29,"debug":2,"events":33,"inherits":6}],26:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = Socket
var debug
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var WebSocket = require('websocket').w3cwebsocket
if (typeof window === 'undefined') debug = require('debug')('socket')
else debug = require('debug').log
var OPTS = {
  urlPrefix: 'ws://',
  randomToken: function () { return Math.random().toString(36).substr(2) },
  key: 'webgc'
}
inherits(Socket, EventEmitter)

function Socket (peerId, host, port) {
  if (!(this instanceof Socket)) return Socket(peerId, host, port)
  EventEmitter.call(this)
  this.disconnected = false
  this._url = OPTS.urlPrefix + host + ':' + port + '/peerjs?key=' + OPTS.key +
    '&id=' + peerId + '&token=' + OPTS.randomToken()
  this._socket = new WebSocket(this._url)
  var self = this
  this._socket.onmessage = function (evnt) {
    try {
      var msg = JSON.parse(evnt.data)
    } catch (e) {
      debug("msg from server isn't recognized: " + evnt.data)
      return
    }
    self.emit('message', msg)
  }
  this._socket.onclose = function () {
    debug('Socket is closed')
    self.close()
  }
  this._socket.onopen = function () {
    debug('Socket is open')
  }
  this._socket.onerror = function (e) {
    debug('Error in socket connection: ')
    debug(e)
  }
}

Socket.prototype.send = function (msg) {
  if (this.disconnected) return
  if (!msg) {
    debug('Empty message to send')
    return
  }
  if (!this.disconnected) {
    var data = JSON.stringify(msg)
    this._socket.send(data)
  } else debug("Msg wasn't sent cause socket is desconnected")
}

Socket.prototype.close = function () {
  if (!this.disconnected) {
    this.disconnected = true
    this._socket.close()
  }
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../src/utils/Socket.js","/../../src/utils")
},{"_process":36,"buffer":29,"debug":2,"events":33,"inherits":6,"websocket":15}],27:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/lib/_empty.js","/../../../../../../../usr/local/lib/node_modules/browserify/lib")
},{"_process":36,"buffer":29}],28:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/browser-resolve/empty.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/browser-resolve")
},{"_process":36,"buffer":29}],29:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    this.length = 0
    this.parent = undefined
  }

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(array)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
} else {
  // pre-set for values that may exist in the future
  Buffer.prototype.length = undefined
  Buffer.prototype.parent = undefined
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// Even though this property is private, it shouldn't be removed because it is
// used by `is-buffer` to detect buffer instances in Safari 5-7.
Buffer.prototype._isBuffer = true

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/buffer/index.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/buffer")
},{"_process":36,"base64-js":30,"buffer":29,"ieee754":31,"isarray":32}],30:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
;(function (exports) {
  'use strict'

  var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

  var PLUS = '+'.charCodeAt(0)
  var SLASH = '/'.charCodeAt(0)
  var NUMBER = '0'.charCodeAt(0)
  var LOWER = 'a'.charCodeAt(0)
  var UPPER = 'A'.charCodeAt(0)
  var PLUS_URL_SAFE = '-'.charCodeAt(0)
  var SLASH_URL_SAFE = '_'.charCodeAt(0)

  function decode (elt) {
    var code = elt.charCodeAt(0)
    if (code === PLUS || code === PLUS_URL_SAFE) return 62 // '+'
    if (code === SLASH || code === SLASH_URL_SAFE) return 63 // '/'
    if (code < NUMBER) return -1 // no match
    if (code < NUMBER + 10) return code - NUMBER + 26 + 26
    if (code < UPPER + 26) return code - UPPER
    if (code < LOWER + 26) return code - LOWER + 26
  }

  function b64ToByteArray (b64) {
    var i, j, l, tmp, placeHolders, arr

    if (b64.length % 4 > 0) {
      throw new Error('Invalid string. Length must be a multiple of 4')
    }

    // the number of equal signs (place holders)
    // if there are two placeholders, than the two characters before it
    // represent one byte
    // if there is only one, then the three characters before it represent 2 bytes
    // this is just a cheap hack to not do indexOf twice
    var len = b64.length
    placeHolders = b64.charAt(len - 2) === '=' ? 2 : b64.charAt(len - 1) === '=' ? 1 : 0

    // base64 is 4/3 + up to two characters of the original data
    arr = new Arr(b64.length * 3 / 4 - placeHolders)

    // if there are placeholders, only get up to the last complete 4 chars
    l = placeHolders > 0 ? b64.length - 4 : b64.length

    var L = 0

    function push (v) {
      arr[L++] = v
    }

    for (i = 0, j = 0; i < l; i += 4, j += 3) {
      tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
      push((tmp & 0xFF0000) >> 16)
      push((tmp & 0xFF00) >> 8)
      push(tmp & 0xFF)
    }

    if (placeHolders === 2) {
      tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
      push(tmp & 0xFF)
    } else if (placeHolders === 1) {
      tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
      push((tmp >> 8) & 0xFF)
      push(tmp & 0xFF)
    }

    return arr
  }

  function uint8ToBase64 (uint8) {
    var i
    var extraBytes = uint8.length % 3 // if we have 1 byte left, pad 2 bytes
    var output = ''
    var temp, length

    function encode (num) {
      return lookup.charAt(num)
    }

    function tripletToBase64 (num) {
      return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
    }

    // go through the array every three bytes, we'll deal with trailing stuff later
    for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
      temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
      output += tripletToBase64(temp)
    }

    // pad the end with zeros, but make sure to not forget the extra bytes
    switch (extraBytes) {
      case 1:
        temp = uint8[uint8.length - 1]
        output += encode(temp >> 2)
        output += encode((temp << 4) & 0x3F)
        output += '=='
        break
      case 2:
        temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
        output += encode(temp >> 10)
        output += encode((temp >> 4) & 0x3F)
        output += encode((temp << 2) & 0x3F)
        output += '='
        break
      default:
        break
    }

    return output
  }

  exports.toByteArray = b64ToByteArray
  exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib/b64.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib")
},{"_process":36,"buffer":29}],31:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/buffer/node_modules/ieee754/index.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/buffer/node_modules/ieee754")
},{"_process":36,"buffer":29}],32:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/buffer/node_modules/isarray/index.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/buffer/node_modules/isarray")
},{"_process":36,"buffer":29}],33:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/events/events.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/events")
},{"_process":36,"buffer":29}],34:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/inherits/inherits_browser.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/inherits")
},{"_process":36,"buffer":29}],35:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/isarray/index.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/isarray")
},{"_process":36,"buffer":29}],36:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/process/browser.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/process")
},{"_process":36,"buffer":29}],37:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = require("./lib/_stream_duplex.js")

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/duplex.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream")
},{"./lib/_stream_duplex.js":38,"_process":36,"buffer":29}],38:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


module.exports = Duplex;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/



/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

var keys = objectKeys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
  var method = keys[v];
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
}

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  processNextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/lib/_stream_duplex.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/lib")
},{"./_stream_readable":40,"./_stream_writable":42,"_process":36,"buffer":29,"core-util-is":43,"inherits":34,"process-nextick-args":44}],39:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/lib/_stream_passthrough.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/lib")
},{"./_stream_transform":41,"_process":36,"buffer":29,"core-util-is":43,"inherits":34}],40:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

module.exports = Readable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/


/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events');

/*<replacement>*/
var EElistenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/



/*<replacement>*/
var Stream;
(function (){try{
  Stream = require('st' + 'ream');
}catch(_){}finally{
  if (!Stream)
    Stream = require('events').EventEmitter;
}}())
/*</replacement>*/

var Buffer = require('buffer').Buffer;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/



/*<replacement>*/
var debugUtil = require('util');
var debug;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var StringDecoder;

util.inherits(Readable, Stream);

var Duplex;
function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

var Duplex;
function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options && typeof options.read === 'function')
    this._read = options.read;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (!state.objectMode && typeof chunk === 'string') {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

Readable.prototype.isPaused = function() {
  return this._readableState.flowing === false;
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      if (!addToFront)
        state.reading = false;

      // if we want the data now, just emit it.
      if (state.flowing && state.length === 0 && !state.sync) {
        stream.emit('data', chunk);
        stream.read(0);
      } else {
        // update the buffer info.
        state.length += state.objectMode ? 1 : chunk.length;
        if (addToFront)
          state.buffer.unshift(chunk);
        else
          state.buffer.push(chunk);

        if (state.needReadable)
          emitReadable(stream);
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}


// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (n === null || isNaN(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = computeNewHighWaterMark(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else {
      return state.length;
    }
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  debug('read', n);
  var state = this._readableState;
  var nOrig = n;

  if (typeof n !== 'number' || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended)
      endReadable(this);
    else
      emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0)
      endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  }

  if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read pushed data synchronously, then `reading` will be false,
  // and we need to re-evaluate how much data we can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we tried to read() past the EOF, then emit end on the next tick.
  if (nOrig !== n && state.ended && state.length === 0)
    endReadable(this);

  if (ret !== null)
    this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!(Buffer.isBuffer(chunk)) &&
      typeof chunk !== 'string' &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync)
      processNextTick(emitReadable_, stream);
    else
      emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    processNextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    processNextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain &&
        (!dest._writableState || dest._writableState.needDrain))
      ondrain();
  }

  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    if (false === ret) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      if (state.pipesCount === 1 &&
          state.pipes[0] === dest &&
          src.listenerCount('data') === 1 &&
          !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];


  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain)
      state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  // If listening to data, and it has not explicitly been paused,
  // then call resume to start the flow of data on the next tick.
  if (ev === 'data' && false !== this._readableState.flowing) {
    this.resume();
  }

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        processNextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    processNextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading)
    stream.read(0);
}

Readable.prototype.pause = function() {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  if (state.flowing) {
    do {
      var chunk = stream.read();
    } while (null !== chunk && state.flowing);
  }
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    debug('wrapped data');
    if (state.decoder)
      chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined))
      return;
    else if (!state.objectMode && (!chunk || !chunk.length))
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }; }(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};


// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else if (list.length === 1)
      ret = list[0];
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    processNextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/lib/_stream_readable.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/lib")
},{"./_stream_duplex":38,"_process":36,"buffer":29,"core-util-is":43,"events":33,"inherits":34,"isarray":35,"process-nextick-args":44,"string_decoder/":51,"util":28}],41:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined)
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function')
      this._transform = options.transform;

    if (typeof options.flush === 'function')
      this._flush = options.flush;
  }

  this.once('prefinish', function() {
    if (typeof this._flush === 'function')
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/lib/_stream_transform.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/lib")
},{"./_stream_duplex":38,"_process":36,"buffer":29,"core-util-is":43,"inherits":34}],42:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

module.exports = Writable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/


/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/



/*<replacement>*/
var Stream;
(function (){try{
  Stream = require('st' + 'ream');
}catch(_){}finally{
  if (!Stream)
    Stream = require('events').EventEmitter;
}}())
/*</replacement>*/

var Buffer = require('buffer').Buffer;

util.inherits(Writable, Stream);

function nop() {}

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

var Duplex;
function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

WritableState.prototype.getBuffer = function writableStateGetBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function (){try {
Object.defineProperty(WritableState.prototype, 'buffer', {
  get: internalUtil.deprecate(function() {
    return this.getBuffer();
  }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' +
     'instead.')
});
}catch(_){}}());


var Duplex;
function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function')
      this._write = options.write;

    if (typeof options.writev === 'function')
      this._writev = options.writev;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  processNextTick(cb, er);
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;

  if (!(Buffer.isBuffer(chunk)) &&
      typeof chunk !== 'string' &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    processNextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (typeof cb !== 'function')
    cb = nop;

  if (state.ended)
    writeAfterEnd(this, cb);
  else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function() {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function() {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing &&
        !state.corked &&
        !state.finished &&
        !state.bufferProcessing &&
        state.bufferedRequest)
      clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string')
    encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64',
'ucs2', 'ucs-2','utf16le', 'utf-16le', 'raw']
.indexOf((encoding + '').toLowerCase()) > -1))
    throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);

  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev)
    stream._writev(chunk, state.onwrite);
  else
    stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;
  if (sync)
    processNextTick(cb, er);
  else
    cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished &&
        !state.corked &&
        !state.bufferProcessing &&
        state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      processNextTick(afterWrite, stream, state, finished, cb);
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var buffer = [];
    var cbs = [];
    while (entry) {
      cbs.push(entry.callback);
      buffer.push(entry);
      entry = entry.next;
    }

    // count the one we are adding, as well.
    // TODO(isaacs) clean this up
    state.pendingcb++;
    state.lastBufferedRequest = null;
    doWrite(stream, state, true, state.length, buffer, '', function(err) {
      for (var i = 0; i < cbs.length; i++) {
        state.pendingcb--;
        cbs[i](err);
      }
    });

    // Clear buffer
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null)
      state.lastBufferedRequest = null;
  }
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined)
    this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(state) {
  return (state.ending &&
          state.length === 0 &&
          state.bufferedRequest === null &&
          !state.finished &&
          !state.writing);
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else {
      prefinish(stream, state);
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      processNextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/lib/_stream_writable.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/lib")
},{"./_stream_duplex":38,"_process":36,"buffer":29,"core-util-is":43,"events":33,"inherits":34,"process-nextick-args":44,"util-deprecate":45}],43:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/node_modules/core-util-is/lib/util.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/node_modules/core-util-is/lib")
},{"_process":36,"buffer":29}],44:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict';

if (!process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = nextTick;
} else {
  module.exports = process.nextTick;
}

function nextTick(fn) {
  var args = new Array(arguments.length - 1);
  var i = 0;
  while (i < args.length) {
    args[i++] = arguments[i];
  }
  process.nextTick(function afterTick() {
    fn.apply(null, args);
  });
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/node_modules/process-nextick-args/index.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/node_modules/process-nextick-args")
},{"_process":36,"buffer":29}],45:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/node_modules/util-deprecate/browser.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/node_modules/util-deprecate")
},{"_process":36,"buffer":29}],46:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = require("./lib/_stream_passthrough.js")

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/passthrough.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream")
},{"./lib/_stream_passthrough.js":39,"_process":36,"buffer":29}],47:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var Stream = (function (){
  try {
    return require('st' + 'ream'); // hack to fix a circular dependency issue when used with browserify
  } catch(_){}
}());
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = Stream || exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/readable.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream")
},{"./lib/_stream_duplex.js":38,"./lib/_stream_passthrough.js":39,"./lib/_stream_readable.js":40,"./lib/_stream_transform.js":41,"./lib/_stream_writable.js":42,"_process":36,"buffer":29}],48:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = require("./lib/_stream_transform.js")

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/transform.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream")
},{"./lib/_stream_transform.js":41,"_process":36,"buffer":29}],49:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = require("./lib/_stream_writable.js")

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream/writable.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/readable-stream")
},{"./lib/_stream_writable.js":42,"_process":36,"buffer":29}],50:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/stream-browserify/index.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/stream-browserify")
},{"_process":36,"buffer":29,"events":33,"inherits":34,"readable-stream/duplex.js":37,"readable-stream/passthrough.js":46,"readable-stream/readable.js":47,"readable-stream/transform.js":48,"readable-stream/writable.js":49}],51:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/string_decoder/index.js","/../../../../../../../usr/local/lib/node_modules/browserify/node_modules/string_decoder")
},{"_process":36,"buffer":29}]},{},[1]);
