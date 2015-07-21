/**
* @module src/services*/
module.exports = GossipFactory

var debug = require('debug')('gossip_factory')
var its = require('its')
// XXX exports.Worker could be better ? when the client runs in a web browser
// XXX This implementation of web workers is totally useful but it is not possible to
// install it in G5K nodes
var Worker = require('webworker-threads').Worker
// XXX This package is used for doing experiments on G5K
// var Worker = require('webworker')
// var Worker = require('webworkify')
// XXX probably browserify-fs isn't needed
// var fs = require('fs') || require('browserify-fs')
var fs = require('fs')

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
  this.gossipUtil = gossipUtil
  this._id = id
  this.inventory = {}
  if (typeof window === 'undefined') {
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
    var cls = require('../algorithms/' + algOpts.class)
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
      this.inventory[algoId] = this.createWebWorker(algOpts, opts, algoId)
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
  var code = this._buildWorkerHeader(algoId, algOpts.class, statsOpts.activated)
  var keysWithFunc = this.searchFunctions(algOpts)
  var i
  if (keysWithFunc.length > 0) {
    for (i = 0; i < keysWithFunc.length; i++) {
      algOpts[ keysWithFunc[i] ] = String(algOpts[ keysWithFunc[i] ])
    }
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
  if (typeof window === 'undefined') {// In node.js
    var fP = __filename.split('services/GossipFactory.js')[0] + 'workers/' + algoId + '.js'
    fs.writeFileSync(fP, code)
    if (!fs.existsSync(fP)) throw Error('While creating worker file')
    return new Worker(fP)
  } else { // TODO doing else with workerify
    // window.URL = window.URL || window.webkitURL
    // var Blob = exports.Blob
    // var blob = new Blob([code], {type: 'text/javascript'})
    // var blobUrl = window.URL.createObjectURL(blob)
    // return new Worker(blobUrl)
  }
}

GossipFactory.prototype._buildWorkerHeader = function (algoId, algoClass, statsActiv) {
  var code = ''
  var inNodejs = typeof window === 'undefined'
  var classToExport
  if (inNodejs) {
    var isCommon, content, headers, j, workerPath
    code += 'var debug = console.log\n'
  } else {
    code += "var debug = require('debug')('" + algoId + "')\n"
  }
  code += "debug('Initialization of worker')\n"
  var fP = __filename.split('services/GossipFactory.js')[0]
  var filesToModif = Object.keys(this.modifInfo.files)
  for (var i = 0; i < filesToModif.length; i++) {
    classToExport = filesToModif[i].split('/')[1].split('.')[0]
    if (inNodejs) {
      isCommon = this.modifInfo.files[filesToModif[i]]
      content = fs.readFileSync(fP + filesToModif[i], {encoding: 'utf8'})
      if (isCommon) headers = this.modifInfo.commonHeaders
      else headers = this.modifInfo.nonCommonHeaders
      for (j = 0; j < headers.length; j++) content = content.replace(headers[j], '//')
      content = '(function (exports) {\n' + content
      content += 'exports.' + classToExport + ' = ' + classToExport + '\n'
      content += '}) (this)'
      workerPath = fP + 'workers/' + filesToModif[i].split('/')[1]
      fs.writeFileSync(workerPath, content)
      if (!fs.existsSync(workerPath)) throw Error('While building worker')
      code += "this.importScripts('" + workerPath + "')\n"
    } else {
      code += 'var ' + classToExport + " = require('../" + filesToModif[i] + "')\n"
    }
  }
  code += 'var isLogActivated = ' + statsActiv + '\n'
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
