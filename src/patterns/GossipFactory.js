/**
* @module lib/patterns */
(function(exports){
  /**
  * @class GossipFactory
  * @description This class implements a factory that creates instances of gossip-based protocols. The 
  * creation of each protocol is performed via an object that contains the configuration of the protocol,
  * this object is called configuration object.
  * @author Raziel Carvajal Gomez <raziel.carvajal-gomez@inria.fr> */  
  function GossipFactory(opts){
    this.log = opts.log;
    this.gossipUtil = opts.gossipUtil;
    this.inventory = {};
  }
  /**
  * @method checkProperties
  * @description This method verifies if the properties in a configuration object have a the right type and the
  * valid value for each property.
  * @param {Object} opts - Configuration object of a gossip protocol. */ 
  GossipFactory.prototype.checkProperties = function(opts){
    if( typeof opts.data === 'undefined' )
      throw 'The local data could be defined';
    if( typeof opts.viewSize !== 'number' || opts.viewSize < 1 )
      throw "Protocol's size view is not valid";
    if( typeof opts.fanout !== 'number' || opts.fanout < 1 )
      throw "Protocol's message size is not valid";
    if( typeof opts.periodTimeOut !== 'number' || opts.periodTimeOut < 2000 )
      throw "Protocol's periodicity is not valid";
    if( typeof opts.propagationPolicy.push !== 'boolean' )
      throw 'Propagation policy (push) is not boolean';
    if( typeof opts.propagationPolicy.pull !== 'boolean' )
      throw 'Propagation policy (pull) is not boolean';
  };
  /**
  * @method createProtocol
  * @description This method creates an instance of a gossip protocol, this protocol is described by the
  * parameter opts. The reference of every gossip protocol will be kept in the GossipFactory.inventory
  * property of the factory.
  * @param {Object} opts - Configuration object of a gossip protocol. */
  GossipFactory.prototype.createProtocol = function(algoId, algOpts){
    try{
      if( typeof algOpts.class !== 'string' )
        throw "The class of the algorithm must be a string";
      var algoName = exports[algOpts.class];
      if(algoName === 'undefined')
        throw 'Algorithm: ' + algOpts.class + ' does not exist in WebGC' ;
      //if users missed options in the configuration file, standards options are used insted
      this.gossipUtil.extendProperties(algOpts, algoName.defaultOpts);
      //additional options are given for logging proposes
      this.gossipUtil.extendProperties(algOpts, {
        'algoId': algoId,
        peerId: this.peerId,
      });
      this.checkProperties(algOpts);
      var logOpts = {
        host: this.log.host,
        port: this.log.port,
        header: algOpts.class + '_' + this.peerId
      };
      if( !this.inventory.hasOwnProperty(algoId) )
        this.inventory[algoId] = this.createWebWorker(algOpts, logOpts);
      else
        throw "The Object's identifier (" + algoId + ") already exists";
    }catch(e){
      this.log.error("Gossip-based protocol wasn't created. " + e);
    }
  };
  
  GossipFactory.prototype.createWebWorker = function(algOpts, logOpts){
    var origin = window.location.href.split('peerjs-gossip')[0];
    origin += 'peerjs-gossip/';
    var statements = "importScripts('" + origin + "src/utils/LoggerForWebWorker.js');\n";
    statements    += "var logOpts = " + JSON.stringify(logOpts) + ";\n";
    statements    += "var log = new Logger(logOpts);\n";
    statements    += "importScripts('" + origin + "src/utils/GossipUtil.js');\n";
    statements    += "var gossipUtil = new GossipUtil(log);\n";
    statements    += "importScripts('" + origin + "src/apis/GossipProtocol.js');\n";
    
    var keysWithFunc = this.searchFunctions(algOpts), i;
    if(keysWithFunc.length > 0){
      statements  += "importScripts('" + origin + "src/apis/SimilarityFunction.js');\n";
      for(i = 0; i < keysWithFunc.length; i++)
        algOpts[ keysWithFunc[i] ] = String(algOpts[ keysWithFunc[i] ]);
    }
    
    statements    += "importScripts('" + origin + "src/algorithms/" + algOpts.class + ".js');\n";
    statements    += "var algOpts = " + JSON.stringify(algOpts) + ";\n";
    
    for(i = 0; i < keysWithFunc.length; i++)
      statements  += "algOpts[" + "'" + keysWithFunc[i] + "'" + "] = eval(" + algOpts[ keysWithFunc[i]] + ");\n";
    statements    += "var algo = new " + algOpts.class + "(algOpts, log, gossipUtil);\n";
    statements    += "importScripts('" + origin + "src/workers/GossipMediator.js');\n";
    //"this" referes the web-worker
    statements    += "var m = new GossipMediator(algo, log, this);\n";
    statements    += "algo.setMediator(m);\n";
    statements    += "m.listen();\n";
    
    window.URL = window.URL || window.webkitURL;
    var blob = new Blob([statements], {type: 'text/javascript'});
    var blobUrl = window.URL.createObjectURL(blob);
    return new Worker(blobUrl);
  };
  
  GossipFactory.prototype.searchFunctions = function(obj){
    var keys = Object.keys(obj), keysWithFunc = [];
    for(var i = 0; i < keys.length; i++){
      if(typeof obj[ keys[i] ] === 'function'){ keysWithFunc.push(keys[i]); }
    }
    return keysWithFunc;
  };
  /**
  * @method setDependencies
  * @description In some cases, there are gossip protocols that have dependencies amog them. This method
  * reads the property dependencies in the configuration object and establishes those dependencies. For
  * this method, a dependency is to share the property of one gossip protocol with another gossip protocol.*/
  //GossipFactory.prototype.setDependencies = function(gossipAlgos, simFunCatalogue){
  //  var keys = Object.keys(gossipAlgos);
  //  for( var i = 0; i < keys.length; i++ ){
  //    if( gossipAlgos[ keys[i] ].hasOwnProperty('attributes') ){
  //      var atts = gossipAlgos[ keys[i] ].attributes;
  //      var attsKeys = Object.keys(atts);
  //      for( var j = 0; j < attsKeys.length; j++ ){
  //        var algoAttStr = atts[ attsKeys[j] ];
  //        var container = algoAttStr.split('.');
  //        if( container.length === 2 ){
  //          this.log.info('c0: ' + container[0] + ' c1: ' + container[1]);
  //          var objExt = this.inventory[ container[0] ];
  //          if( objExt !== 'undefined' ){
  //            if( objExt[ container[1] ] !== 'undefined'){
  //              this.inventory[ keys[i] ][ attsKeys[j] ] = objExt[ container[1] ];
  //              this.log.info('Algorithm [' + keys[i] + '] was augmented with the property [' +
  //                attsKeys[j] + ']');
  //            }else{
  //              this.log.error('There is no property [' + container[1] + '] for the algorithm [' +
  //                container[0] + '], as a consecuence, the algorithm [' + keys[i]  + '] will ' +
  //                'have fatal errors during its execution');
  //            }
  //          }else{
  //            this.log.error('The protocol with id [' + payload + '] was not loaded by the Factory');
  //          }
  //        }else if(container.length === 1){
  //          this.log.info('c0: ' + container[0]);
  //          var objSim = simFunCatalogue[ container[0] ];
  //          if(objSim !== 'undefined'){
  //            this.inventory[ keys[i] ][ attsKeys[j] ] = objSim;
  //            this.log.info('Algorithm [' + keys[i] + '] was augmented with the simiilarity function ['+
  //              container[0] + ']');
  //          }else{
  //            this.log.error('There is not property [' + container[0] + '] at the catalogue of '+
  //              'similarity functions. The algorithm with ID [' + keys[i] + '] has not assigned '+
  //              'any similarity function');
  //          }
  //        }else{
  //          this.log.error('The value [' + algoAttStr + '] for the attribute [' + attsKeys[j] +
  //            '] has not the right format (separation by a period). As a consecuence, the algorithm ' +
  //            '[' + keys[i] + '] will have fatal errors during its execution.');
  //        }
  //      }
  //    }else{
  //      this.log.info('The algorithm [' + keys[i] + '] has not dependencies ' +
  //        'with others algorithms.');
  //    }
  //  }
  //};
  
  exports.GossipFactory = GossipFactory;
})(this);
