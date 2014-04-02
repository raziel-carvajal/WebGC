(function(exports){
  function GossipFactory(){
    this.inventory = {};
  }

  GossipFactory.prototype.checkProperties = function(opts){
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
    if( typeof opts.dependencies !== 'object' && typeof opts.dependencies.length !== 'number')
      throw "Objects' dependencies aren't an array";
  };

  GossipFactory.prototype.createProtocol = function(opts){
    try{
      var protocol;
      if( typeof opts.iD !== 'string' )
        throw "Object's ID must be a string";
      if( typeof opts.object !== 'string' )
        throw "Object's name must be a string";
      var constructor = exports[opts.object];
      if( typeof constructor === 'undefined' )
        throw 'Object does not exist in the library of the system';
      gossipUtil.extendProperties(opts, constructor.defaultOpts);
      this.checkProperties(opts);
      protocol = new constructor(opts);
      if( !this.inventory.hasOwnProperty(opts.iD) )
        this.inventory[opts.iD] = protocol;
      else
        throw "The Object's identifier (" + opts.iD + ") already exists";
    }catch(e){
      console.log("Gossip-based protocol wasn't created\n\t" + e);
    }
  };

  GossipFactory.prototype.setDependencies = function(){
    var deps; var keys = Object.keys(this.inventory);
    var i, j;
    for( i = 0; i < keys.length; i++ ){
      deps = this.inventory[ keys[i] ].dependencies;
      if( typeof deps !== 'undefined' ){
        for( j = 0; j < deps.length; j++ ){
          if( deps[i].hasOwnProperty('objectId') ){
            "";
          }
          if( deps[i].hasOwnProperty('externalObj') ){
            // TODO Code for finding a link among the objects in the Factory
            // , in a dinamically way, must be written here!!
          }
        }
      }
      var dep = deps[i];
      try{
        this.verifyAttributes(dep.obj, dep.objAtt);
        this.verifyAttributes(dep.dependency, dep.dependencyAtt);
        this.inventory[dep.obj][dep.objAtt] = this.inventory[dep.dependency][dep.dependencyAtt];
      }catch(e){
        console.log('The dependency was not created\n\t' + e);
      }
    }
  };

  GossipFactory.prototype.verifyAttributes = function(obj, att){
    if( this.inventory[obj] === 'undefined' )
      throw 'There is not an instance of the object';
    if( this.inventory[obj][att] === 'undefined' )
      throw 'The attribute is not defined in the object';
  };

  exports.GossipFactory = GossipFactory;
})(this);
