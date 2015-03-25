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
    var target = msg.receiver;
    this.broadcast({
      header: 'LOOKUP',
      path: [msg.emitter],
      'target': target,
      steps: 0,
      emitter: msg.emitter
    });
    if(!this.gossipMsgsToSend[target]){ this.gossipMsgsToSend[target] = []; }
    this.gossipMsgsToSend[target].push(msg);
  };
  
  LookupService.prototype.doBroadcastLater = function(msg){
    var self = this;
    window.setTimeout(function(){ self.broadcast(msg); }, 5000);
  };
  
  LookupService.prototype.broadcast = function(msg){
    this.log.info('Doing brodcast');
    var keys = Object.keys(this.peerCons), i;
    if(keys.length === 0){
      this.log.warn('Peer.connections is empty, doing brodcast later');
      this.doBroadcastLater(msg);
      return;
    }else{
      var consPerNeig;
      for(i = 0; i < keys.length; i++){
        consPerNeig = this.connections[ keys[i] ];
        if(consPerNeig[ keys[i] ].length !== 0 && (consPerNeig[ keys[i] ][0]).open){
          logger.info('Doing broadcast with ' + keys[i] + ' using Peer.con');
          (consPerNeig[ keys[i] ][0]).send(msg);
        }else
          this.log.warn('Peer.con with ' + keys[i] + ' is not ready');
      }
    }
    keys = Object.keys(this.connections);
    if(keys.length === 0){
      this.log.warn('LookupService.connections is empty, doing broadcast later');
      this.doBroadcastLater(msg);
      return;
    }else{
      for(i = 0; i < keys.length; i++){
        if(this.connections[ keys[i] ] && (this.connections[ keys[i] ]).open){
          this.log.info('Doing broadcast with ' + keys[i] + ' using LookupService.con')
          (this.connections[ keys[i] ]).send(msg);
        }else
          this.log.warn('LookupService.con with ' + keys[i] + ' is not ready');
      }
    }
    this.log.info('Broadcast is done');
  };
  LookupService.prototype.updateConnection = function(c){ this.currentCo = c; };
  LookupService.prototype.broadcast = function(msg){};
  LookupService.prototype.dispatch = function(msg){
    switch(msg.header){
      case 'LOOKUP':

        break;
      case 'LOOKUP_ANSW':
        break;
      default:
        break;
    }
  };
  exports.LookupService = LookupService;
})(this);
