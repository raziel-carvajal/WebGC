/**
* @module src/services*/
var debug = require('debug')('gossip_factory')
var its = require('its')
// XXX exports.Worker could be better ?
var Worker = require('webworker-threads').Worker
//var Worker = require('webworkify')
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
function GossipFactory (gossipUtil) {
  this.gossipUtil = gossipUtil
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
    this.gossipUtil.extendProperties(algOpts, {'algoId': algoId})
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
  var statements = 'var debug\n'
  statements += "console.log('WORKER')\n"
  statements += "console.log(this.require)\n"
  statements += "if (typeof console.log !== 'undefined') {\n"
  statements += '  debug = console.log\n'
  statements += "  this.importScripts('../utils/GossipUtil.js')\n"
  statements += "  this.importScripts('../superObjs/GossipProtocol.js')\n"
  statements += "  this.importScripts('../superObjs/ViewSelector.js')\n"
  statements += "  this.importScripts('../algorithms/" + algOpts.class + ".js')\n"
  statements += "  this.importScripts('../controllers/GossipMediator.js')\n"
  statements += '} else {\n'
  statements += "  debug = require('debug')('" + algoId + "')\n"
  statements += "  var GossipUtil = require('../utils/GossipUtil')\n"
  statements += "  var GossipProtocol = require('../superObjs/GossipProtocol')\n"
  statements += "  var ViewSelector = require('../superObjs/ViewSelector')\n"
  statements += '  var ' + algOpts.class + " = require('../algorithms/" + algOpts.class + "')\n"
  statements += "  var GossipMediator = require('../controllers/GossipMediator')\n"
  statements += '}\n'
  statements += 'var isLogActivated = ' + statsOpts.activated + ';\n'
  var keysWithFunc = this.searchFunctions(algOpts)
  var i
  if (keysWithFunc.length > 0) {
    for (i = 0; i < keysWithFunc.length; i++) {
      algOpts[ keysWithFunc[i] ] = String(algOpts[ keysWithFunc[i] ])
    }
  }
  statements += 'var algOpts = ' + JSON.stringify(algOpts) + '\n'
  for (i = 0; i < keysWithFunc.length; i++) {
    statements += "algOpts['" + keysWithFunc[i] + "'] = eval(" + algOpts[ keysWithFunc[i]] + ')\n'
  }
  statements += "debug('Worker initialization BEGINS');\n"
  statements += 'var gossipUtil = new GossipUtil(debug)\n'
  statements += 'var algo = new ' + algOpts.class + '(algOpts, debug, gossipUtil, isLogActivated)\n'
  statements += 'var mediator = new GossipMediator(algo, this, debug)\n'
  statements += 'algo.setMediator(mediator)\n'
  statements += 'mediator.listen()\n'
  statements += "debug('Worker initialization DONE')"
  if (typeof window === 'undefined') {// In node.js
    var fP = __filename.split('services/GossipFactory.js')[0] + 'workers/' + algoId + '.js'
    fs.writeFileSync(fP, statements)
    if (!fs.existsSync(fP)) throw Error('While creating worker file')
    return new Worker(fP)
  } else { // TODO doing else with workerify
    // window.URL = window.URL || window.webkitURL
    // var Blob = exports.Blob
    // var blob = new Blob([statements], {type: 'text/javascript'})
    // var blobUrl = window.URL.createObjectURL(blob)
    // return new Worker(blobUrl)
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
//           debug('c0: ' + container[0] + ' c1: ' + container[1])
//           var objExt = this.inventory[ container[0] ]
//           if( objExt !== 'undefined' ){
//             if( objExt[ container[1] ] !== 'undefined'){
//               this.inventory[ keys[i] ][ attsKeys[j] ] = objExt[ container[1] ]
//               debug('Algorithm [' + keys[i] + '] was augmented with the property [' +
//                 attsKeys[j] + ']')
//             }else{
//               debug('There is no property [' + container[1] + '] for the algorithm [' +
//                 container[0] + '], as a consecuence, the algorithm [' + keys[i]  + '] will ' +
//                 'have fatal errors during its execution')
//             }
//           }else{
//             debug('The protocol with id [' + payload + '] was not loaded by the Factory')
//           }
//         }else if(container.length === 1){
//           debug('c0: ' + container[0])
//           var objSim = simFunCatalogue[ container[0] ]
//           if(objSim !== 'undefined'){
//             this.inventory[ keys[i] ][ attsKeys[j] ] = objSim
//             debug('Algorithm [' + keys[i] + '] was augmented with the simiilarity function ['+
//               container[0] + ']')
//           }else{
//             debug('There is not property [' + container[0] + '] at the catalogue of '+
//               'similarity functions. The algorithm with ID [' + keys[i] + '] has not assigned '+
//               'any similarity function')
//           }
//         }else{
//           debug('The value [' + algoAttStr + '] for the attribute [' + attsKeys[j] +
//             '] has not the right format (separation by a period). As a consecuence, the algorithm ' +
//             '[' + keys[i] + '] will have fatal errors during its execution.')
//         }
//       }
//     }else{
//       debug('The algorithm [' + keys[i] + '] has not dependencies ' +
//         'with others algorithms.')
//     }
//   }
// }
module.exports = GossipFactory
