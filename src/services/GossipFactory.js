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
  Worker = require('webworker-threads').Worker
  fs = require('fs')
} else {
  debug = require('debug').log
  fs = require('browserify-fs')
  Worker = window.Worker
  if (typeof Worker === 'undefined') throw new Error('Your browser does not support web-workers')
  window.URL = window.URL || window.webkitURL
  var Blob = window.Blob
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
  if (inNodeJS) this._origin = __filename.split('services/GossipFactory.js')[0]
  else {
    debug('__filename in Browser: ' + __filename)
    this._origin = window.location.href.split('peerjs-gossip')[0]
    this._origin += 'peerjs-gossip/src/'
  }
  debug('Origin: ' + this._origin)
  this.modifInfo = {
    files: {},
    contentAltered: {},
    commonHeaders: ['module.exports'],
    nonCommonHeaders: [
      'module.exports',
      'var inherits',
      'var GossipProtocol',
      'var ViewSelector',
      'inherits('
    ]
  }
  this.filesToAltered = [
    'utils/GossipUtil.js',
    'superObjs/GossipProtocol.js',
    'superObjs/ViewSelector.js',
    'controllers/GossipMediator.js'
  ]
  for (var i = 0; i < this.filesToAltered.length; i++) {
    this.modifInfo.files[ this.filesToAltered[i] ] = true
    this.modifInfo.contentAltered[ this.filesToAltered[i] ] = ''
  }
  EventEmitter.call(this)
  this._algosDB = {}
  this.on('readFile', function () {
  })
}
GossipFactory.prototype._setProperties = function (files) {
  for (var i = 0; i < files.length; i++) {
    // TODO if new protocols are added by the user, consider to add a new option with the full path of
    // the protocols in the configuration file that WebGC receives as input
    this._algosDB[files[i].split('.')[0]] = require(this._origin + 'algorithms/' + files[i])
    this.modifInfo.files[ 'algorithms/' + files[i] ] = false
    this.modifInfo.contentAltered[ 'algorithms/' + files[i] ] = ''
    this.filesToAltered.push( 'algorithms/' + files[i] )
  }
}
GossipFactory.prototype.createProtocols = function (gossipObj, otherAlgos, profile, statsOpts) {
  // TODO find the way to import, in the worker file, the algorithm that will be instantited. For the moment,
  // all algorithms in src/algorithms are added
  // var otherIds = Object.keys(otherAlgos)
  var isCommon, file, classToExport, srcToModif, i, content, workerPath, algosIds, algOpts
  if (inNodeJS) {
    var files = fs.readdirSync(this._origin + 'algorithms')
    debug(files)
    this._setProperties(files)
    for (i = 0; i < this.filesToAltered.length; i++) {
      file = this.filesToAltered[i]
      debug('Changing: ' + file)
      classToExport = file.split('/')[1].split('.')[0]
      isCommon = this.modifInfo.files[file]
      srcToModif = this._origin + file
      content = fs.readFileSync(srcToModif, { encoding: 'utf8' })
      this._alterFile(classToExport, isCommon, content)
      workerPath = this._origin + 'workers/' + file.split('/')[1]
      fs.writeFileSync(workerPath, content)
      if (!fs.existsSync(workerPath)) throw Error('While making ' + file + ' run in web-worker context')
      debug('File ' + file + ' could be run in a web-worker context')
      this.modifInfo.contentAltered[file] = workerPath
    }
    algosIds = Object.keys(gossipObj)
    for (i = 0; i < algosIds.length; i++) {
      algOpts = gossipObj[ algosIds[i] ]
      algOpts.data = profile
      this._createProtocol(algosIds[i], algOpts, statsOpts)
    }
  } else {
    var self = this
    fs.readdir(this._origin + 'algorithms', function (err, files) {
      if (err) return new Error('Error while listing gossip implementations. ' + e)
      self._setProperties(files)
      for (i = 0; i < self.filesToAltered.length; i++) {
        file = self.filesToAltered[i]
        classToExport = file.split('/')[1].split('.')[0]
        isCommon = self.modifInfo.files[file]
        srcToModif = self._origin + file
        fs.readFile(srcToModif, function (err, data) {
          if (err) return new Error('While reading file ' + fileToModif + err)
          self._alterFile(classToExport, isCommon, data)
          var blob = new Blob([data], {type: 'text/javascript'})
          var blobUrl = window.URL.createObjectURL(blob)
          self.modifInfo.contentAltered[file] = blobUrl
          // Every file was altered to be compatible in a webworker context
          if ( i === self.filesToAltered.length - 1 ) {
            algosIds = Object.keys(gossipObj)
            for (var j = 0; j < algosIds.length; j++) {
              algOpts = gossipObj[ algosIds[j] ]
              algOpts.data = profile
              self._createProtocol(algosIds[j], algOpts, statsOpts)
              // TODO if j === algosIds.length -1 >> launch bootstrap event
            }
          }
        })
      }
    })
  }
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
    // additional options are given for logging proposes
    this.gossipUtil.extendProperties(algOpts, {'algoId': algoId, peerId: this._id})
    var opts = {
      activated: statsOpts.activated,
      feedbackPeriod: statsOpts.feedbackPeriod,
      header: algOpts.class
    }
    if (!this.inventory[algoId]) {
      var fP
      var code = this._buildWorkerHeader(algoId, algOpts.class, opts, algOpts)
      if (inNodeJS) {
        fP = this._origin + 'workers/' + algoId + '_' + this._id + '.js'
        fs.writeFileSync(fP, code)
        if (!fs.existsSync(fP)) throw new Error('While creating worker file')
      } else {
        var blob = new Blob([code], {type: 'text/javascript'})
        fP = window.URL.createObjectURL(blob)
      }
      this.inventory[algoId] = new Worker(fP)
      debug('Worker ' + this._id + ' was created')
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
GossipFactory.prototype._buildWorkerHeader = function (algoId, algoClass, statsActiv, algOpts) {
  var file, i
  var code = 'var isLogActivated = ' + statsActiv + '\n'
  if (inNodeJS) code += "var debug = console.log\ndebug('Worker initialization')\n"
  else code += "var debug = function (msg) {}\ndebug('Worker initialization')\n"
  for (i = 0; i < this.filesToAltered.length; i++) {
    file = this.filesToAltered[i]
    if (file.match('algorithms') === null) {
      code += "this.importScripts('" + this.modifInfo.contentAltered[file] + "')\n" 
    }
  }
  if (this.modifInfo.contentAltered['algorithms/' + algoClass + '.js']) debug('File to import exists') 
  else debug('File to import does not exists')
  code += "this.importScripts('" + this.modifInfo.contentAltered['algorithms/' + algoClass + '.js'] + "')\n"
  var keysWithFunc = this.searchFunctions(algOpts)
  if (keysWithFunc.length > 0) {
    for (i = 0; i < keysWithFunc.length; i++) algOpts[ keysWithFunc[i] ] = String(algOpts[ keysWithFunc[i] ])
  }
  code += 'var algOpts = ' + JSON.stringify(algOpts) + '\n'
  for (i = 0; i < keysWithFunc.length; i++) {
    code += "algOpts['" + keysWithFunc[i] + "'] = eval(" + algOpts[ keysWithFunc[i]] + ')\n'
  }
  code += "debug('Worker initialization BEGINS')\n"
  code += 'var gossipUtil = new GossipUtil(debug)\n'
  code += 'var algo = new ' + algoClass + '(algOpts, debug, gossipUtil, isLogActivated)\n'
  code += 'var mediator = new GossipMediator(algo, this, debug)\n'
  code += 'algo.setMediator(mediator)\n'
  code += 'mediator.listen()\n'
  code += "debug('Worker initialization DONE')"
  return code
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
