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
    this.peerId = opts.peerId;
    this.log = opts.log;
    this.inventory = {};
    this.gossipUtil = opts.gossipUtil;
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
        header: algoName + '_' + algoId
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
    var statements = "importScripts('../../src/utils/LoggerForWebWorker.js');";
    statements    += "var logOpts = " + JSON.stringify(logOpts) + ";";
    statements    += "var log = new Logger(logOpts);";
    
    statements    += "importScripts('../../src/utils/GossipUtil.js');";
    statements    += "var gossipUtil = new GossipUtil(log);";
    statements    += "importScripts('../../src/apis/GossipProtocol.js');";
    
    var keysWithFunc = this.searchFunctions(algOpts), i;
    console.log('algOpts before');
    console.log(algOpts);
    if(keysWithFunc.length > 0){
      console.log('keysWithFunc has items');
      statements  += "importScripts('../../src/apis/SimilarityFunction.js');";
      for(i = 0; i < keysWithFunc.length; i++)
        algOpts[ " ' " + keysWithFunc[i] + " ' " ] = String(algOpts[ keysWithFunc[i] ]);
    }
    console.log('algOpts after');
    console.log(algOpts);
    statements    += "importScripts('../../src/algorithms/" + opts.class + ".js');";
    statements    += "var algOpts = " + JSON.stringify(algOpts) + ";";
    for(i = 0; i < keysWithFunc.length; i++){
      statements  += "eval( var " + keysWithFunc[i] + " = " + algOpts[ keysWithFunc[i]] + ");";
      statements  += "algOpts[' " + keysWithFunc[i] + " '] = " + keysWithFunc[i] + ";";
    }
    statements    += "log.info(JSON.stringify(algOpts));";
    statements    += "var algo = new " + opts.class + "(algOpts, log, gossipUtil);";
    
    statements    += "importScripts('../../src/workers/GossipMediator.js');";
    //"this" referes the web-worker
    statements    += "var mediator = new GossipMediator(algo, log, this);";
    statements    += "algo.setMediator(mediator);";
    statements    += "mediator.listen();";
    
    var blob = new BlobBuilder();
    blob.append(statements);
    var blobUrl = URL.createObjectURL(blob.getBlob());
    console.log(blobUrl);
    return new Worker(blobUrl);
  };
  
  GossipFactory.prototype.searchFunctions = function(obj){
    var keys = Object.keys(obj), keysWithFunc = [];
    for(var i = 0; i < keys.length; i++){
      if(typeof obj[ keys[i] ] === 'function')
        keysWithFunc.push(keys[i]);
    }
    return keysWithFunc;
  };
  /**
  * @method setDependencies
  * @description In some cases, there are gossip protocols that have dependencies amog them. This method
  * reads the property dependencies in the configuration object and establishes those dependencies. For
  * this method, a dependency is to share the property of one gossip protocol with another gossip protocol.*/
  GossipFactory.prototype.setDependencies = function(gossipAlgos, simFunCatalogue){
    var keys = Object.keys(gossipAlgos);
    for( var i = 0; i < keys.length; i++ ){
      if( gossipAlgos[ keys[i] ].hasOwnProperty('attributes') ){
        var atts = gossipAlgos[ keys[i] ].attributes;
        var attsKeys = Object.keys(atts);
        for( var j = 0; j < attsKeys.length; j++ ){
          var algoAttStr = atts[ attsKeys[j] ];
          var container = algoAttStr.split('.');
          if( container.length === 2 ){
            this.log.info('c0: ' + container[0] + ' c1: ' + container[1]);
            var objExt = this.inventory[ container[0] ];
            if( objExt !== 'undefined' ){
              if( objExt[ container[1] ] !== 'undefined'){
                this.inventory[ keys[i] ][ attsKeys[j] ] = objExt[ container[1] ];
                this.log.info('Algorithm [' + keys[i] + '] was augmented with the property [' +
                  attsKeys[j] + ']');
              }else{
                this.log.error('There is no property [' + container[1] + '] for the algorithm [' +
                  container[0] + '], as a consecuence, the algorithm [' + keys[i]  + '] will ' +
                  'have fatal errors during its execution');
              }
            }else{
              this.log.error('The protocol with id [' + payload + '] was not loaded by the Factory');
            }
          }else if(container.length === 1){
            this.log.info('c0: ' + container[0]);
            var objSim = simFunCatalogue[ container[0] ];
            if(objSim !== 'undefined'){
              this.inventory[ keys[i] ][ attsKeys[j] ] = objSim;
              this.log.info('Algorithm [' + keys[i] + '] was augmented with the simiilarity function ['+
                container[0] + ']');
            }else{
              this.log.error('There is not property [' + container[0] + '] at the catalogue of '+
                'similarity functions. The algorithm with ID [' + keys[i] + '] has not assigned '+
                'any similarity function');
            }
          }else{
            this.log.error('The value [' + algoAttStr + '] for the attribute [' + attsKeys[j] +
              '] has not the right format (separation by a period). As a consecuence, the algorithm ' +
              '[' + keys[i] + '] will have fatal errors during its execution.');
          }
        }
      }else{
        this.log.info('The algorithm [' + keys[i] + '] has not dependencies ' +
          'with others algorithms.');
      }
    }
  };
  
  exports.GossipFactory = GossipFactory;
})(this);
