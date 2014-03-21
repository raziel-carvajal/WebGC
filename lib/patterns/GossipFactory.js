(function(exports){
  function GossipFactory(){
    this.inventory = {};
  }

  GossipFactory.prototype.checkProperties = function(opts){
    if( typeof opts.data === 'undefined' )
      throw 'The local data could be defined';
    if( typeof opts.viewSize !== 'number' || opts.options.viewSize < 1 )
      throw "Protocol's size view is not valid";
    if( typeof opts.gossipLenght !== 'number' || opts.options.gossipLenght < 1 )
      throw "Protocol's message size is not valid";
    if( typeof opts.periodTime !== 'number' || opts.options.periodTime < 2000 )
      throw "Protocol's periodicity is not valid";
    if( typeof opts.propagationPolicy.push !== 'boolean' )
      throw 'Propagation policy (push) is not boolean';
    if( typeof opts.propagationPolicy.pull !== 'boolean' )
      throw 'Propagation policy (pull) is not boolean';
  };

  GossipFactory.prototype.createProtocol = function(opts){
    var protocol;
    try{
      if( typeof opts.name != 'string' )
        throw "Protocol's name is not a string";
      var constructor = exports[opts.name];
      if( typeof constructor === 'undefined' )
        throw 'The protocol does not exist in the library of the system';
      gossipUtil.extendProperties(opts, constructor.defaultOpts);
      this.checkProperties(opts);
      protocol = constructor(opts);
      this.inventory[constructor] = protocol;
    }catch(e){
      console.log('The gossip-based protocol was not created\n\t' + e);
    }
    return protocol;
  };

  GossipFactory.prototype.setDependencies = function(deps){
    for( var i = 0, ii = deps.length; i < ii; i++ ){
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

})(this);
