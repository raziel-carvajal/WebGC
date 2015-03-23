(function(exports){
  
  //function LookupMsg(emitter, target){
  //  if( !(this instanceof LookupMsg) ){ return new LookupMsg(emitter, target); }
  //  this.isTargetReached = false;
  //  this.target = target;
  //  this.hop = 0;
  //  this.pathToTarget = emitter + '_';
  //}
  //
  //LookupMsg.prototype.addLink = function(l){ this.pathToTarget += '_'; };
  //
  //exports.LookupMsg = LookupMsg;
  
  function LookupService(peerCons, logger){
    this.logger = logger;
    this.peerCons = peerCons;
    this.lookupMsgs = {};
  }
  
  LookupService.prototype.doBroadcastLater = function(msg){
    var self = this;
    window.setTimeout(function(){ this.broadcast(msg); }, 3000);
  };
  
  LookupService.prototype.broadcast = function(msg){
    var keys = Object.keys(this.peerCons);
    if(keys.length === 0){
      logger.warn('Any connection has been stablished, scheduling later execution');
      this.doBroadcastLater(msg);
      return;
    }else{
      var consPerNeig;
      for(var i = 0; i < keys.length; i++){
        consPerNeig = this.peerCons[ keys[i] ];
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
