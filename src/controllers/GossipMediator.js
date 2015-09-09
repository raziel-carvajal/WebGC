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
  this.lastActCycTime = new Date()
  var log = { loop: this.algo.loop, algoId: this.algo.algoId, view: JSON.stringify(this.algo.view) }
  this.postInMainThread({ header: 'logInConsole', log: JSON.stringify(log) })
  // first try for measuring stats (not a good idea)
  // self.sentActiveCycleStats()
  // performing periodic gossip selection (no changes in view are done)
  this.algo.selectItemsToSend('active')
  this.debug(this.algo.algoId + ': End of loop ' + this.algo.loop)
  this.algo.loop++
  this.algo.increaseAge()
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
    var msg = e.data
    switch (msg.header) {
      case 'firstView':
        self.debug(self.algo.algoId + ': First view size ' + msg.view.length)
        self.algo.initialize(msg.view)
        break
      case 'gossipLoop':
        self.debug(self.algo.algoId + ': gossipLoop msg received')
        self._doActiveThread()
        break
      case 'incomingMsg':
        self.algo.selectItemsToKeep(msg)
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
        debug('DeleteViewItems was called, items to remove: ' + msg.items)
        for (var i = 0; i < msg.items.length; i++)
          if (items.indexOf(msg.items[i],0) !== -1 ) delete self.algo.view[msg.items[i]]
        self.algo.viewSize = msg.newSize
        debug('Current view: ' + Object.keys(self.algo.view))
        break
      case 'updateProfile':
        self.algo.profile.setPayload(msg.profile)
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
