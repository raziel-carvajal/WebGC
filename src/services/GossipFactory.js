/**
* @module src/services*/
module.exports = GossipFactory
var inNodeJS = typeof window === 'undefined'
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var its = require('its')
inherits(GossipFactory, EventEmitter)
var debug, Worker, fs
if (inNodeJS) {
  debug = require('debug')('factory')
  // TODO find why the source of this lib isn't in JS format 
  Worker = require('webworker-threads').Worker
  fs = require('fs')
} else {
  debug = require('debug').log
  fs = require('browserify-fs')
  Worker = window.Worker
  if (typeof Worker === 'undefined') throw new Error('Your browser does not support web-workers')
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
function GossipFactory (gossipUtil, id) {
  if (!(this instanceof GossipFactory)) return new GossipFactory(gossipUtil, id)
  this.gossipUtil = gossipUtil
  this._id = id
  this.inventory = {}
  this._workerToCreate = {}
  this._algosDB = {
    'Cyclon': require('../algorithms/Cyclon.js'),
    'Vicinity': require('../algorithms/Vicinity.js')
  }
  if (inNodeJS) this._origin = __filename.split('services/GossipFactory.js')[0]
  else {
    this._origin = window.location.href.split('peerjs-gossip')[0]
    this._origin += 'peerjs-gossip/src/'
    debug('Origin: ' + this._origin)
    this._alreadyModified = 0
    this._srcChanges = {}
  }
  this.modifInfo = {
    files: {
      'utils/GossipUtil.js': true,
      'superObjs/GossipProtocol.js': true,
      'superObjs/ViewSelector.js': true,
      'algorithms/Cyclon.js': false,
      'algorithms/Vicinity.js': false,
      'controllers/GossipMediator.js': true
    },
    commonHeaders: ['module.exports'],
    nonCommonHeaders: [
      'module.exports',
      'var inherits',
      'var GossipProtocol',
      'var ViewSelector',
      'inherits('
    ]
  }
  EventEmitter.call(this)
  this.on('readFile', function () {
  })
}
/**
* @memberof GossipFactory
* @method checkProperties
* @description Verifies if the attributes in a
* [configuration object]{@link module:src/confObjs#configurationObj} have the correct type as well as
* the minimal value.
* @param opts Object with the attributes of one gossip protocol*/
GossipFactory.prototype.checkProperties = function (opts) {
  its.defined(opts.data)
  its.number(opts.viewSize)
  its.range(opts.viewSize > 1)
  its.number(opts.fanout)
  its.range(opts.fanout > 1)
  its.number(opts.periodTimeOut)
  its.range(opts.periodTimeOut >= 2000)
  its.boolean(opts.propagationPolicy.push)
  its.boolean(opts.propagationPolicy.pull)
}
/**
* @memberof GossipFactory
* @method createProtocol
* @description Creates an instance of one gossip protocol, the reference of the protocol will be kept
* in the local attribute "inventory" identified by a unique ID.
* @param algoId Unique identifier of one gossip protocol
* @param algOpts Object with the attributes of one gossip protocol*/
GossipFactory.prototype.createProtocol = function (algoId, algOpts, statsOpts) {
  debug('Checking if gossip algorithms are available')
  try {
    its.string(algOpts.class)
    var cls = this._algosDB[algOpts.class]
    if (typeof cls === 'undefined') throw new Error('Algorithm: ' + algOpts.class + ' is not in WebGC')
    this.gossipUtil.extendProperties(algOpts, cls.defaultOpts)
    // additional options are given for logging proposes
    this.gossipUtil.extendProperties(algOpts, {'algoId': algoId, peerId: this._id})
    this.checkProperties(algOpts)
    var opts = {
      activated: statsOpts.activated,
      feedbackPeriod: statsOpts.feedbackPeriod,
      header: algOpts.class
    }
    if (!this.inventory[algoId]) {
      var workerInstance = this.createWebWorker(algOpts, opts, algoId)
      if (workerInstance) this.inventory[algoId] = workerInstance
      else debug('Worker: ' + algoId + ' will be added later')
    } else {
      throw new Error("The Object's identifier (" + algoId + ') already exists')
    }
  } catch (e) {
    debug(e)
  }
}
/**
* @memberof GossipFactory
* @method createWebWorker
* @description Creates one web worker with a group of objects required to perform the computation
* of one gossip protocol.
* @param algOpts Object with the attributes of one gossip protocol
* @param statsOpts Settings of a [logger]{@link module:src/utils#LoggerForWebWorker} object
* @return Worker New WebWorker*/
GossipFactory.prototype.createWebWorker = function (algOpts, statsOpts, algoId) {
  var code = this._buildWorkerHeader(algoId, algOpts.class, statsOpts.activated, algOpts)
  if (code) {
    debug('Worker header is ready')
    this._completeWorker(algOpts, code)
    if (inNodeJS) {
      var fP = this._origin + 'workers/' + algoId + '_' + this._id + '.js'
      fs.writeFileSync(fP, code)
      if (!fs.existsSync(fP)) throw Error('While creating worker file')
      return new Worker(fP)
    } else debug('No way to have sync mode in the browser')
  }
  //} else {
  //  window.URL = window.URL || window.webkitURL
  //  var Blob = window.Blob
  //  var blob = new Blob([code], {type: 'text/javascript'})
  //  var blobUrl = window.URL.createObjectURL(blob)
  //  return new Worker(blobUrl)
  //}
}
GossipFactory.prototype._buildWorkerHeader = function (algoId, algoClass, statsActiv, algOpts) {
  var i
  var code = 'var isLogActivated = ' + statsActiv + '\n'
  var filesToModif = Object.keys(this.modifInfo.files)
  if (inNodeJS) {
    code += "var debug = console.log\ndebug('Worker initialization')\n"
    for (i = 0; i < filesToModif.length; i++) code += this._editSrc(filesToModif[i], undefined)
    this._completeWorker(algOpts, code)
    return code
  } else {// this is one non async call
    code += "var debug = function (msg) {}\ndebug('Worker initialization')\n"
    for (i = 0; i < filesToModif.length; i++) this._editSrc(filesToModif[i], code)
  }
}
GossipFactory.prototype._editSrcs = function (fileToModif, code) {
  var content
  var classToExport = fileToModif.split('/')[1].split('.')[0]
  var isCommon = this.modifInfo.files[fileToModif]
  var srcToModif = this._origin + fileToModif
  if (inNodeJS) {
    content = fs.readFileSync(srcToModif, { encoding: 'utf8' })
    this._alterFile(classToExport, isCommon, content)
    var workerPath = this._origin + 'workers/' + fileToModif.split('/')[1]
    fs.writeFileSync(workerPath, content)
    if (!fs.existsSync(workerPath)) throw Error('While building worker')
    code += "this.importScripts('" + workerPath + "')\n"
    return code
  } else {
    var self = this
    fs.readFile(srcToModif, function (err, data) {
      if (err) {
        debug('While reading worker file. ' + err)
        return
      }
      self._alreadyModified++
      var filesToModif = Object.keys(this.modifInfo.files)
      self._alterFile(classToExport, isCommon, data)
      window.URL = window.URL || window.webkitURL
      var Blob = window.Blob
      var blob = new Blob([data], {type: 'text/javascript'})
      var blobUrl = window.URL.createObjectURL(blob)
      code += "this.importScripts('" + blobUrl + "')\n"
      self._srcChanges = blobUrl
      //if (self._alreadyModified === filesToModif.length)
    })
  } 
}
GossipFactory.prototype._alterFile = function (cls, isCommon, content) {
  var headers
  if (isCommon) headers = this.modifInfo.commonHeaders
  else headers = this.modifInfo.nonCommonHeaders
  for (var j = 0; j < headers.length; j++) content = content.replace(headers[j], '//')
  content = '(function (exports) {\n' + content
  content += 'exports.' + cls + ' = ' + cls + '\n'
  content += '}) (this)'
  return content
}
GossipFactory.prototype._completeWorker = function (algOpts, code) {
  var keysWithFunc = this.searchFunctions(algOpts)
  var i
  if (keysWithFunc.length > 0) {
    for (i = 0; i < keysWithFunc.length; i++) algOpts[ keysWithFunc[i] ] = String(algOpts[ keysWithFunc[i] ])
  }
  code += 'var algOpts = ' + JSON.stringify(algOpts) + '\n'
  for (i = 0; i < keysWithFunc.length; i++) {
    code += "algOpts['" + keysWithFunc[i] + "'] = eval(" + algOpts[ keysWithFunc[i]] + ')\n'
  }
  code += "debug('Worker initialization BEGINS')\n"
  code += 'var gossipUtil = new GossipUtil(debug)\n'
  code += 'var algo = new ' + algOpts.class + '(algOpts, debug, gossipUtil, isLogActivated)\n'
  code += 'var mediator = new GossipMediator(algo, this, debug)\n'
  code += 'algo.setMediator(mediator)\n'
  code += 'mediator.listen()\n'
  code += "debug('Worker initialization DONE')"
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
