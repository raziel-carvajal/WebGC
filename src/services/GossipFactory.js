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
  //TODO packaging with browserify doesn't work if this package is used
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
