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
    if( typeof opts.periodTime !== 'number' || opts.periodTime < 2000 )
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
      this.gossipUtil.extendProperties(opts, {peerId: this.peerId, 
        loggingServer: this.loggingServer});
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
  GossipFactory.prototype.setDependencies = function(){
    var keys = Object.keys(this.inventory);
    var obj, extObj, keysDeps;
    for( var i = 0; i < keys.length; i++ ){
      obj = this.inventory[ keys[i] ];
      if( typeof obj.attributes !== 'undefined' ){
        // TODO To add exceptions per member of each dependency
        keysDeps = Object.keys(obj.attributes);
        for( var j = 0; j < keysDeps.length; j++ ){
          if( typeof obj[ keysDeps[j] ] !== 'undefined' ){
            extObj = this.inventory[ obj.attributes[ keysDeps[j] ] ];
            if( typeof extObj !== 'undefined' ){
              obj[ keysDeps[j] ] = extObj;
            }else{
              this.log('The attribute [' + obj.attributes[ keysDeps[j] ] + 
                '] has became undefined');
            }
          }else{
            this.log.error('The attribute [' + keysDeps[j] + '] was assigned before ' + 
              'extending the object [' + obj.class + ']' );
          }
        }
      }
    }
  };
  
  exports.GossipFactory = GossipFactory;
})(this);
