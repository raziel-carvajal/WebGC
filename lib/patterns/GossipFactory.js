/**
* @module lib/patterns */
(function(exports){
  /**
  * @class GossipFactory
  * @classdesc This class implements a factory that creates instances of gossip-based protocols. The 
  * creation of each protocol is performed via an object that contains the configuration of the protocol,
  * this object is called configuration object.
  * @author Raziel Carvajal Gomez <raziel.carvajal-gomez@inria.fr> */  
  function GossipFactory(opts){
    this.peerId = opts.peerId;
    this.loggingServer = opts.loggingServer;
    this.inventory = {};
    this.log = new Logger(opts.loggingServer);
    this.log.setOutput(opts.peerId, this.constructor.name);
    this.gossipUtil = new GossipUtil({loggingServer: opts.loggingServer});
    this.gossipUtil.log.setOutput(opts.peerId, this.constructor.name);
  }
  /**
  * @method checkProperties
  * @desc This method verifies if the properties in a configuration object have a the right type and the
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
  * @desc This method creates an instance of a gossip protocol, this protocol is described by the
  * parameter opts. The reference of every gossip protocol will be kept in the GossipFactory.inventory
  * property of the factory.
  * @param {Object} opts - Configuration object of a gossip protocol. */
  GossipFactory.prototype.createProtocol = function(opts, algoId){
    try{
      var protocol;
      if( typeof opts.class !== 'string' )
        throw "The class of the algorithm must be a string";
      var constructor = exports[ opts.class ];
      if( typeof constructor === 'undefined' )
        throw 'Object does not exist in the library of the system';
      this.gossipUtil.extendProperties(opts, constructor.defaultOpts);
      // peerId is the unique identifier for each PeerJS instance
      this.gossipUtil.extendProperties(opts, {peerId: this.peerId, 
        loggingServer: this.loggingServer, protoId: algoId});
      this.checkProperties(opts);
      protocol = new constructor(opts);
      if( !this.inventory.hasOwnProperty(algoId) )
        this.inventory[algoId] = protocol;
      else
        throw "The Object's identifier (" + algoId + ") already exists";
    }catch(e){
      this.log.error("Gossip-based protocol wasn't created. " + e);
    }
  };
  /**
  * @method setDependencies
  * @desc In some cases, there are gossip protocols that have dependencies amog them. This method
  * reads the property dependencies in the configuration object and establishes those dependencies. For
  * this method, a dependency is to share the property of one gossip protocol with another gossip protocol.*/ 
  GossipFactory.prototype.setDependencies = function(gossipAlgos){
    var keys = Object.keys(gossipAlgos);
    for( var i = 0; i < keys.length; i++ ){
      if( gossipAlgos[ keys[i] ].hasOwnProperty('attributes') ){
        var atts = gossipAlgos[ keys[i] ].attributes;
        var attsKeys = Object.keys(atts);
        for( var j = 0; j < attsKeys.length; j++ ){
          var algoAttStr = atts[ attsKeys[j] ];
          var container = algoAttStr.split('.');
          if( container.length === 2 ){
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
