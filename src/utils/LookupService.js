(function(exports){
  
  function LookupService(log, peerCons, handleConFn){
    if(!(this instanceof LookupService)){ return new LookupService(log, peerCons, handleConFn); }
    this.log = log;
    this.peerCons = peerCons;
    this.connections = {};
    this.gossipMsgsToSend = {};
    this.waitingPathFor = {};
    this.discoveredPaths = {};
    this.handleConnection = handleConFn;
  }
  
  LookupService.prototype.apply = function(msg){

  };
  LookupService.prototype.doBroadcastLater = function(msg){
    var self = this;
    window.setTimeout(function(){ this.broadcast(msg); }, 5000);
  };
  
  LookupService.prototype.broadcast = function(msg){
    var keys = Object.keys(this.connections);
    if(keys.length === 0){
      logger.warn('Any connection has been stablished, scheduling later execution');
      this.doBroadcastLater(msg);
      return;
    }else{
      var consPerNeig;
      for(var i = 0; i < keys.length; i++){
        consPerNeig = this.connections[ keys[i] ];
        if(consPerNeig[ keys[i] ].length !== 0 && (consPerNeig[ keys[i] ][0]).open){
          logger.info('Sending broadcast msg to ' + keys[i]);
          (consPerNeig[ keys[i] ][0]).send(msg);
        }else
          logger.warn('Connections with ' + keys[i] + ' are still not ready');
      }
    }
  };
  LookupService.prototype.updateConnection = function(c){ this.currentCo = c; };
  LookupService.prototype.broadcast = function(msg){};
  exports.LookupService = LookupService;
})(this);
