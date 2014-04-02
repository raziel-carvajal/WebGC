(function(exports){
  function GossipProtocol(opts){
    this.nonImpMsg = 'An implementation for this method is required';
    this.view = {};
    this.loop = 0;
    this.object = opts.object;
    this.data = opts.data;
    this.viewSize = opts.viewSize;
    this.gossipLength = opts.gossipLength;
    this.periodTime = opts.periodTime;
    this.propagationPolicy = opts.propagationPolicy;
    this.dependencies = opts.dependencies;
  }
  GossipProtocol.prototype.increaseAge = function(){ throw this.nonImpMsg; };
  GossipProtocol.prototype.getLog = function(){ throw this.nonImpMsg; };
  GossipProtocol.prototype.selectPeer = function(){ throw this.nonImpMsg; };
  GossipProtocol.prototype.getItemsToSend = function(thisId, dstPeer, thread){ throw this.nonImpMsg; };
  GossipProtocol.prototype.selectItemsToKeep = function(thisId, rcvCache){ throw this.nonImpMsg; };
  GossipProtocol.prototype.initialize = function(keys){ throw this.nonImpMsg; };

  exports.GossipProtocol = GossipProtocol;
})(this);
