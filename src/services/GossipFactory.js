/**
* @module src/services*/
module.exports = GossipFactory
var Worker = require('webworker-threads').Worker
var fs = require('fs') || require('browserify-fs')

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
function GossipFactory (opts) {
  this.log = opts.log
  this.gossipUtil = opts.gossipUtil
  this.inventory = {}
}
/**
* @memberof GossipFactory
* @method checkProperties
* @description Verifies if the attributes in a
* [configuration object]{@link module:src/confObjs#configurationObj} have the correct type as well as
* the minimal value.
* @param opts Object with the attributes of one gossip protocol*/
GossipFactory.prototype.checkProperties = function (opts) {
  if (typeof opts.data === 'undefined') {
    throw new Error('The local data could be defined')
  }
  if (typeof opts.viewSize !== 'number' || opts.viewSize < 1) {
    throw new Error("Protocol's size view is not valid")
  }
  if (typeof opts.fanout !== 'number' || opts.fanout < 1) {
    throw new Error("Protocol's message size is not valid")
  }
  if (typeof opts.periodTimeOut !== 'number' || opts.periodTimeOut < 2000) {
    throw new Error("Protocol's periodicity is not valid")
  }
  if (typeof opts.propagationPolicy.push !== 'boolean') {
    throw new Error('Propagation policy (push) is not boolean')
  }
  if (typeof opts.propagationPolicy.pull !== 'boolean') {
    throw new Error('Propagation policy (pull) is not boolean')
  }
}
/**
* @memberof GossipFactory
* @method createProtocol
* @description Creates an instance of one gossip protocol, the reference of the protocol will be kept
* in the local attribute "inventory" identified by a unique ID.
* @param algoId Unique identifier of one gossip protocol
* @param algOpts Object with the attributes of one gossip protocol*/
GossipFactory.prototype.createProtocol = function (algoId, algOpts) {
  try {
    if (typeof algOpts.class !== 'string') {
      throw new Error('The class of the algorithm must be a string')
    }
    var algoName = exports[algOpts.class]
    if (algoName === 'undefined') {
      throw new Error('Algorithm: ' + algOpts.class + ' does not exist in WebGC')
    }
    // if users missed options in the configuration file, standards options are used instead
    this.gossipUtil.extendProperties(algOpts, algoName.defaultOpts)
    // additional options are given for logging proposes
    this.gossipUtil.extendProperties(algOpts, { 'algoId': algoId, peerId: this.peerId })
    this.checkProperties(algOpts)
    var logOpts = {
      host: this.log.host,
      port: this.log.port,
      activated: this.log.isActivated,
      feedbackPeriod: this.log.feedbackPeriod,
      header: algOpts.class + '_' + this.peerId
    }
    if (!this.inventory.hasOwnProperty(algoId)) {
      this.inventory[algoId] = this.createWebWorker(algOpts, logOpts)
    } else {
      throw new Error("The Object's identifier (" + algoId + ') already exists')
    }
  } catch (e) {
    this.log.error("Gossip-based protocol wasn't created. " + e)
  }
}

/**
* @memberof GossipFactory
* @method createWebWorker
* @description Creates one web worker with a group of objects required to perform the computation
* of one gossip protocol.
* @param algOpts Object with the attributes of one gossip protocol
* @param logOpts Settings of a [logger]{@link module:src/utils#LoggerForWebWorker} object
* @return Worker New WebWorker*/
GossipFactory.prototype.createWebWorker = function (algOpts, logOpts) {
  var statements = "var Logger = require('LoggerForWebWorker')\n"
  statements += 'var logOpts = ' + JSON.stringify(logOpts) + '\n'
  statements += 'var log = new Logger(logOpts)\n'
  statements += "var GossipUtil = require('GossipUtil')\n"
  statements += 'var gossipUtil = new GossipUtil(log)\n'
  statements += "var GossipProtocol = require('GossipProtocol')\n"
  var keysWithFunc = this.searchFunctions(algOpts)
  var i
  if (keysWithFunc.length > 0) {
    statements += "var ViewSelector = require('ViewSelector')\n"
    for (i = 0; i < keysWithFunc.length; i++) {
      algOpts[ keysWithFunc[i] ] = String(algOpts[ keysWithFunc[i] ])
    }
  }
  statements += 'var ' + algOpts.class + " = require('" + algOpts.class + "')\n"
  statements += 'var algOpts = ' + JSON.stringify(algOpts) + '\n'
  for (i = 0; i < keysWithFunc.length; i++) {
    statements += "algOpts['" + keysWithFunc[i] + "'] = eval(" + algOpts[ keysWithFunc[i]] + ')\n'
  }
  statements += 'var algo = new ' + algOpts.class + '(algOpts, log, gossipUtil)\n'
  statements += "var GossipMediator = require('GossipMediator')\n"
  // "this" refers the web-worker
  statements += 'var m = new GossipMediator(algo, log, this)\n'
  statements += 'algo.setMediator(m)\n'
  statements += 'm.listen()'
  // TODO find another way to cope with js files
  // var buf = new Buffer(Buffer.byteLength(statements, 'ascii'))
  // buf.write(statements, 0, 'ascii')
  if (typeof window === 'undefined') {// In node.js
    fs.writeFile('worker.js', statements, function () {
      return new Worker('worker.js')
    })
  } else { // TODO check compatibility with browsers (it works in Chrome)
    window.URL = window.URL || window.webkitURL
    var Blob = exports.Blob
    var blob = new Blob([statements], {type: 'text/javascript'})
    var blobUrl = window.URL.createObjectURL(blob)
    return new Worker(blobUrl)
  }
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

/**
* @memberof GossipFactory
* @method setDependencies
* @deprecated Not useful since version 0.4.1
* @description In some cases, there are gossip protocols that have dependencies among them. This method
* reads the property dependencies in the configuration object and establishes those dependencies. For
* this method, a dependency is to share the property of one gossip protocol with another gossip protocol.*/
// GossipFactory.prototype.setDependencies = function(gossipAlgos, simFunCatalogue){
//   var keys = Object.keys(gossipAlgos)
//   for( var i = 0 i < keys.length i++ ){
//     if( gossipAlgos[ keys[i] ].hasOwnProperty('attributes') ){
//       var atts = gossipAlgos[ keys[i] ].attributes
//       var attsKeys = Object.keys(atts)
//       for( var j = 0 j < attsKeys.length j++ ){
//         var algoAttStr = atts[ attsKeys[j] ]
//         var container = algoAttStr.split('.')
//         if( container.length === 2 ){
//           this.log.info('c0: ' + container[0] + ' c1: ' + container[1])
//           var objExt = this.inventory[ container[0] ]
//           if( objExt !== 'undefined' ){
//             if( objExt[ container[1] ] !== 'undefined'){
//               this.inventory[ keys[i] ][ attsKeys[j] ] = objExt[ container[1] ]
//               this.log.info('Algorithm [' + keys[i] + '] was augmented with the property [' +
//                 attsKeys[j] + ']')
//             }else{
//               this.log.error('There is no property [' + container[1] + '] for the algorithm [' +
//                 container[0] + '], as a consecuence, the algorithm [' + keys[i]  + '] will ' +
//                 'have fatal errors during its execution')
//             }
//           }else{
//             this.log.error('The protocol with id [' + payload + '] was not loaded by the Factory')
//           }
//         }else if(container.length === 1){
//           this.log.info('c0: ' + container[0])
//           var objSim = simFunCatalogue[ container[0] ]
//           if(objSim !== 'undefined'){
//             this.inventory[ keys[i] ][ attsKeys[j] ] = objSim
//             this.log.info('Algorithm [' + keys[i] + '] was augmented with the simiilarity function ['+
//               container[0] + ']')
//           }else{
//             this.log.error('There is not property [' + container[0] + '] at the catalogue of '+
//               'similarity functions. The algorithm with ID [' + keys[i] + '] has not assigned '+
//               'any similarity function')
//           }
//         }else{
//           this.log.error('The value [' + algoAttStr + '] for the attribute [' + attsKeys[j] +
//             '] has not the right format (separation by a period). As a consecuence, the algorithm ' +
//             '[' + keys[i] + '] will have fatal errors during its execution.')
//         }
//       }
//     }else{
//       this.log.info('The algorithm [' + keys[i] + '] has not dependencies ' +
//         'with others algorithms.')
//     }
//   }
// }
