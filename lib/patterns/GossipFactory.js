/**
* @module lib/patterns */
(function(exports){
  /**
  * @class GossipFactory
  * @classdesc This class implements a factory that creates instances of gossip-based protocols. The 
  * creation of each protocol is performed via an object that contains the configuration of the protocol,
  * this object is called configuration object.
  * @author Raziel Carvajal Gomez <raziel.carvajal-gomez@inria.fr> */  
  function GossipFactory(){
    this.inventory = {};
  }
  /**
  * @method checkProperties
  * @desc This method verifies if the properties in a configuration object have a the right type and the
  * valid value for each property.
  * @param {Object} opts - Configuration object of a gossip protocol. */ 
  GossipFactory.prototype.checkProperties = function(opts){
    if( typeof opts.iD !== 'string' )
      throw "Object's ID must be a string";
    if( typeof opts.data === 'undefined' )
      throw 'The local data could be defined';
    if( typeof opts.viewSize !== 'number' || opts.viewSize < 1 )
      throw "Protocol's size view is not valid";
    if( typeof opts.gossipLength !== 'number' || opts.gossipLength < 1 )
      throw "Protocol's message size is not valid";
    if( typeof opts.periodTime !== 'number' || opts.periodTime < 2000 )
      throw "Protocol's periodicity is not valid";
    if( typeof opts.propagationPolicy.push !== 'boolean' )
      throw 'Propagation policy (push) is not boolean';
    if( typeof opts.propagationPolicy.pull !== 'boolean' )
      throw 'Propagation policy (pull) is not boolean';
    if( typeof opts.dependencies !== 'undefined' ){
      if( typeof opts.dependencies !== 'object' && typeof opts.dependencies.length !== 'number')
        throw "Objects' dependencies aren't an array";
    }else{
      console.log("Object's properites hasn't dependencies");
    }
  };
  /**
  * @method createProtocol
  * @desc This method creates an instance of a gossip protocol, this protocol is described by the
  * parameter opts. The reference of every gossip protocol will be kept in the GossipFactory.inventory
  * property of the factory.
  * @param {Object} opts - Configuration object of a gossip protocol. */
  GossipFactory.prototype.createProtocol = function(opts){
    try{
      var protocol;
      if( typeof opts.object !== 'string' )
        throw "Object's name must be a string";
      var constructor = exports[opts.object];
      if( typeof constructor === 'undefined' )
        throw 'Object does not exist in the library of the system';
      gossipUtil.extendProperties(opts, constructor.defaultOpts);
      this.checkProperties(opts);
      protocol = new constructor(opts);
      if( !this.inventory.hasOwnProperty(opts.iD) )
        this.inventory[protocol.iD] = protocol;
      else
        throw "The Object's identifier (" + opts.iD + ") already exists";
    }catch(e){
      console.log("Gossip-based protocol wasn't created\n\t" + e);
    }
  };
  /**
  * @method setDependencies
  * @desc In some cases, there are gossip protocols that have dependencies amog them. This method
  * reads the property dependencies in the configuration object and establishes those dependencies. For
  * this method, a dependency is to share the property of one gossip protocol with another gossip protocol.*/ 
  GossipFactory.prototype.setDependencies = function(){
    var keys = Object.keys(this.inventory);
    var i, obj, deps, j, extObj, extAt, locAt;
    for( i = 0; i < keys.length; i++ ){
      obj = this.inventory[ keys[i] ];
      deps = obj.dependencies;
      if( typeof deps !== 'undefined' ){
        // TODO To add exceptions per member of each dependency
        for( j = 0; j < deps.length; j++ ){
          if( deps[j].hasOwnProperty('objectId') ){
            extObj = this.inventory[ deps[j].objectId ];
            extAt = deps[j].externalAtt;
            locAt = deps[j].localAtt;
            obj[ locAt ] = extObj[ extAt ];
          }
          if( deps[j].hasOwnProperty('externalObj') ){
            // TODO Code for finding a link among the objects in the Factory
            // , in a dinamically way, must be written here!!
          }
        }
      }
    }
  };

  GossipFactory.prototype.verifyAttributes = function(){
    // TODO this code must check every entry of each dependencie
  };

  exports.GossipFactory = GossipFactory;
})(this);