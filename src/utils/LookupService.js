(function(exports){
  
  function LookupService(log, peerCons, handleConFn, id, peerJSopts){
    if(!(this instanceof LookupService))
      return new LookupService(log, peerCons, handleConFn, id, peerJSopts);
    this.log = log;
    this.peerCons = peerCons;
    this.connections = {};
    this.gossipMsgsToSend = {};
    this.waitingPathFor = {};
    this.discoveredPaths = {};
    this.handleConnection = handleConFn;
    //Peer.id (local ID)
    this.id = id;
    this.opts = peerJSopts;
    this.iceCandidateSent = {};
    //called like that for being compatible with PeerJS
    this.socket = {};
    this.socket.send = this.send;
  }
  
  LookupService.prototype.apply = function(msg){
    var target = msg.receiver;
    var dc = new DataConnection(target, this);
    this.connections[target] = dc;
    this.iceCandidateSent[target] = false;
    var self = this;
    dc.on('open', function(){
      dc.send(self.gossipMsgsToSend[dc.peer].pop());
    });
    
    dc.on('error', function(e){
      self.log.error('In connection between ' + self.id + ' and ' + dc.peer);
    });
    
    this.waitingPathFor[target] = true;
    if(!this.gossipMsgsToSend[target]){ this.gossipMsgsToSend[target] = []; }
    this.gossipMsgsToSend[target].push(msg);
  };
  
  LookupService.prototype.dispatch = function(msg){
    var con;
    switch(msg.type){
      case 'REQ':
        msg.path.push(this.id);
        msg.steps++;
        if(msg.target === this.id){
          this.inOfferReception(msg);
          //TODO CONTINUE !!
          
        }else{
          this.broadcast(msg);
        }
        break;
      case 'ANSW':
        msg.steps--;
        if(msg.emitter === id){
          if(this.waitingPathFor[msg.target]){
            delete this.waitingPathFor[msg.target];
            this.discoveredPaths[msg.target] = msg.path;
            this.doNegotiation(msg.target);
          }
          //here the request is igonered because the target was already removed from
          //this.waitingPathFor. This is actually the end of the lookup.
          //TODO maintaining different paths for the same target could be better
          //due to peers dinamicity; in the near future LookupService will could into
          //a DHT or another P2P data structure
        }else{
          con = this.getConnection(msg.path[msg.steps]);
          if(con)
            con.send(msg);
          else
            this.log.error('Lookup, ANSW transmition to emitter is lost. Msg: ' + JSON.stringify(msg));
        }
        break;
      default:
        this.log.warn('Lookup msg is not recognized. Msg: ' + JSON.stringify(msg));
        break;
    }
  };
  LookupService.prototype.doNegotiation = function(peerId){
    
  };
  LookupService.prototype.getConnection = function(peerId){
    if(this.peerCons[peerId] && (this.peerCons[peerId][0]).open)
      return this.peerCons[peerId][0];
    else if(this.connections[peerId] && (this.connections[peerId]).open)
      return this.connections[peerId];
    else
      this.log.error('Connection to ' + peerId + ' is closed besides its presence at path');
    return;
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
        consPerNeig = this.peerCons[ keys[i] ];
        if(consPerNeig.length !== 0 && (consPerNeig[0]).open){
          logger.info('Doing broadcast with ' + keys[i] + ' using Peer.con');
          (consPerNeig[0]).send(msg);
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
  
  LookupService.prototype.inOfferReception = function(msg){
    var dc = new DataConnection(msg.emitter, this, {
      connectionId: msg.connectionId,
      _payload: msg.payload,
      metadata: msg.payload.metadata,
      label: msg.payload.label,
      serialization: msg.payload.serialization,
      reliable: msg.payload.reliable
    });
    this.connections[msg.emitter] = dc;
    this.iceCandidateSent[msg.emitter] = false;
    this.handleConnection(dc);
  };
  
  LookupService.prototype.send = function(msg){
    this.log.info('Provider.sed was called with msg: ' + JSON.stringify(msg));
    var outMsg = {};
    switch(msg.type){
      case 'OFFER':
        outMsg.header = 'LOOKUP';
        outMsg.type = 'REQ';
        outMsg.path = [this.id];
        outMsg.steps = 0;
        outMsg.target = msg.dst;
        outMsg.emitter = this.id;
        outMsg.payload = msg.payload;
        this.log.info('LookupService.broadcast with msg: ' + JSON.stringify(outMsg));
        this.broadcast(outMsg);
        break;
      case 'ANSWER':
        //got from peerjs._makeAnswer
        //type: 'ANSWER',
        //payload: {
        //  sdp: answer,
        //  type: connection.type,
        //  connectionId: connection.id,
        //  browser: util.browser
        //},
        //dst: connection.peer
        //TODO stock outgoing msgs for later
       outMsg.type = 'ANSW';
          msg.steps--;
          con = this.getConnection(msg.path[msg.steps]);
          if(con)
            con.send({});
          else
            this.log.error('LookUp, first ANSW to emitter is lost. Msg: ' + JSON.stringify(msg)); 
        break;
      default:
        break;
    }
  };
  
  exports.LookupService = LookupService;
})(this);
