(function(exports){
  function GossipFactory(){
    this.inventory = {};
  }

  GossipFactory.prototype.checkStdAttributes = function(opts){
    if( typeof opts.name != 'string' )
      throw "Protocol's name is not a string";
    if( typeof opts.options.viewSize != 'number' || opts.options.viewSize < 1 )
      throw "Protocol's size view is not valid";
    if( typeof opts.options.gossipLenght != 'number' || opts.options.gossipLenght < 1 )
      throw "Protocol's message size is not valid";
    if( typeof opts.options.periodTime != 'number' || opts.options.periodTime < 2000 )
      throw "Protocol's periodicity is not valid";
    if( typeof opts.options.propagationPolicy.push != 'boolean' )
      throw 'Propagation policy (push) is not boolean';
    if( typeof opts.options.propagationPolicy.pull != 'boolean' )
      throw 'Propagation policy (pull) is not boolean';
  };

  GossipFactory.prototype.createProtocol = function(opts){};
  GossipFactory.prototype.verifyAttributes = function(protocol){};

})(this);
