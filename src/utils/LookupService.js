(function(exports){
  
  function LookupService(log, peerCons, handleConFn, id, peerJSopts){
    if(!(this instanceof LookupService))
      return new LookupService(log, peerCons, handleConFn, id, peerJSopts);
    this.log = log;
    this.peerCons = peerCons;
    this.connections = {};
    this.gossipMsgsToSend = {};
    this.discoveredPaths = {};
    this.handleConnection = handleConFn;
    //Peer.id (local ID)
    this.id = id;
    this.options = peerJSopts;
    this.iceCandidateReceived = {};
    //called like that for being compatible with PeerJS
    this.socket = {};
    var self = this;
    this.socket.send = function(msg){ self.send(msg); };
  }
  
  LookupService.prototype.apply = function(msg){
    var target = msg.receiver;
    this.discoveredPaths[target] = {
      originator: true, path: null, steps: null, firstRec: false
    };
    this.iceCandidateReceived[target] = {received: false, candidate: null};
    if(!this.gossipMsgsToSend[target]){ this.gossipMsgsToSend[target] = []; }
    this.gossipMsgsToSend[target].push(msg);
    var dc = new DataConnection(target, this,{serialization: 'json'});
    this.connections[target] = dc;
    
    var self = this;
    dc.on('open', function(){
      var gossipMsg = self.gossipMsgsToSend[dc.peer].pop();
      if(gossipMsg){
        self.log.info('Handshake done, sending msg: ' + JSON.stringify(gossipMsg));
        dc.send(gossipMsg);
      }else
        self.log.error('Void entry at LookupService.gossipMsgsToSend for peer: ' + dc.peer);
    });
    
    dc.on('error', function(e){
      self.log.error('In connection between ' + self.id + ' and ' + dc.peer);
    });
  };
  
  LookupService.prototype.dispatch = function(msg){
    var con;
    switch(msg.type){
      case 'REQ':
        msg.path.push(this.id);
        msg.steps++;
        if(msg.target === this.id){
          msg.steps--;
          this.iceCandidateReceived[msg.emitter] = { received: false, candidate: null };
          this.discoveredPaths[msg.emitter] = {
            originator: false, path: msg.path, steps: msg.steps
          };
          this.inOfferReception(msg);
        }else
          this.broadcast(msg);
        break;
      case 'ANSW':
        msg.steps--;
        if(msg.target === this.id){
          var pathInfo = this.discoveredPaths[msg.emitter];
          if(pathInfo.originator && !pathInfo.firstRec){
            pathInfo.firstRec = true;
            pathInfo.path = msg.path;
            msg.type = 'ANSWER';
            con = this.getConnection(msg.emitter);
            if(con)
              con.handleMessage(msg);
            else
              this.log.error('ANSWER reception ignored cos the connection dissapears');
          }
          //here the request is igonered because the target was already removed from
          //LookupService.waitingPathFor. This is actually the end of the lookup.
          //TODO maintaining different paths for the same target could be better
          //due to peers dinamicity; in the near future LookupService will could into
          //a DHT or another P2P data structure
        }else{
          con = this.getConnection(msg.path[msg.steps]);
          if(con)
            con.send(msg);
          else
            this.log.error('ANSW transmition to emitter is lost. Msg: ' + JSON.stringify(msg));
        }
        break;
      case 'PING':
        msg.steps++;
        this.inForwardMsg(msg);
        break;
      case 'PONG':
        msg.steps--;
        this.inForwardMsg(msg);
        break;
      default:
        this.log.warn('Lookup msg is not recognized. Msg: ' + JSON.stringify(msg));
        break;
    }
  };
  
  LookupService.prototype.inForwardMsg = function(msg){
    var con;
    if(msg.target === this.id){
      msg.type = 'CANDIDATE';
      con = this.getConnection(msg.emitter);
      if(con){ con.handleMessage(msg); }
      else{ this.log.error('CANDIDATE reception ignored cos the connection dissapears'); }
    }else{
      con = this.getConnection(msg.path[msg.steps]);
      if(con){ con.send(msg); }
      else{ this.log.error('Forward is lost cos link ' + msg.steps + ' is broken'); }
    }
  };
  
  LookupService.prototype.inOfferReception = function(msg){
    var payload = msg.payload;
    var dc = new DataConnection(msg.emitter, this, {
      connectionId: payload.connectionId,
      _payload: payload,
      metadata: payload.metadata,
      label: payload.label,
      serialization: payload.serialization,
      reliable: payload.reliable
    });
    this.connections[msg.emitter] = dc;
    this.handleConnection(dc);
  };
 
  LookupService.prototype.createLoUpMsg = function(type, path, steps, target, payload){
    return{
      service: 'LOOKUP', 'type': type, 'path': path,
      'steps': steps, 'target': target, emitter: this.id,
      'payload': payload
    };
  };
  
  LookupService.prototype.send = function(msg){
    this.log.info('Provider.send was called with msg: ' + JSON.stringify(msg));
    var outMsg, path, steps, connection;
    switch(msg.type){
      case 'OFFER':
        outMsg = this.createLoUpMsg('REQ', [this.id], 0, msg.dst, msg.payload);
        this.log.info('LookupService.broadcast with msg: ' + JSON.stringify(outMsg));
        this.broadcast(outMsg);
        break;
      case 'ANSWER':
        path = this.discoveredPaths[msg.dst].path;
        steps = this.discoveredPaths[msg.dst].steps;
        if(path && steps){
          outMsg = this.createLoUpMsg('ANSW', path, steps, msg.dst, msg.payload);
          connection = this.getConnection( path[steps] );
          if(connection)
            connection.send(outMsg);
          else{
            this.log.error('Link between ' + this.id + ' and ' + loUpMsg.path[loUpMsg.steps]+
              'is broken. Answer is lost.');
          }
        }else
          this.log.error('Entry for emitter: ' + msg.dst + ' is lost, why?');
        break;
      case 'CANDIDATE':
        path = this.discoveredPaths[msg.dst].path;
        var ice = this.iceCandidateReceived[msg.dst];
        if(!ice.received && path){
          this.ice.received = true;
          this.ice.candidate = msg.payload;
          if(this.discoveredPaths[msg.dst].originator){
            outMsg = this.createLoUpMsg('PING', path, 1, msg.dst, msg.payload);
            connection = this.getConnection(path[1]);
            if(connection)
              connection.send(outMsg);
            else
              this.log.error('Ice candidate was not sent, fist link is broken');
          }else{
            steps = this.discoveredPaths[msg.dst].steps;
            outMsg = this.createLoUpMsg('PONG', path, steps, msg.dst, msg.payload);
            connection = this.getConnection(path[steps]);
            if(connection)
              connection.send(outMsg);
            else
              this.log.error('Ice candidate was not sent, last link is broken');
          }
        }
        //In both sides of the communication just one ICE candidate is set up,
        //normally the browser provides a set of ICE candidates and the cost of
        //forward them via the LookupService is higher
        break;
      default:
        this.log.error('PeerJS msg ' + msg.type + ' is not recognized');
        break;
    }
  };
  
  LookupService.prototype.getConnection = function(peerId){
    if(this.peerCons[peerId] && this.peerCons[peerId][0])
      return this.peerCons[peerId][0];
    else if(this.connections[peerId])
      return this.connections[peerId];
    else
      this.log.error('Connection to ' + peerId + ' is closed or does not exist');
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
        if(consPerNeig[0]){
          this.log.info('Doing broadcast with ' + keys[i] + ' using Peer.con');
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
        if(this.connections[ keys[i] ]){
          this.log.info('Doing broadcast with ' + keys[i] + ' using LookupService.con');
          (this.connections[ keys[i] ]).send(msg);
        }else
          this.log.warn('LookupService.con with ' + keys[i] + ' is not ready');
      }
    }
    this.log.info('Broadcast is done');
  };
  exports.LookupService = LookupService;
})(this);
