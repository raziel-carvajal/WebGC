(function(exports){
  
  function LookupService(log, peerCons, handleConFn, id, peerJSopts, multi, stl){
    if(!(this instanceof LookupService))
      return new LookupService(log, peerCons, handleConFn, id, peerJSopts, multi, stl);
    var self = this;
    this.log = log;
    this.peerCons = peerCons;
    this.connections = {};
    this.gossipMsgsToSend = {};
    this.discoveredPaths = {};
    this.handleConnection = handleConFn;
    //Peer.id (local ID)
    this.id = id;
    this.options = peerJSopts;
    this.lookupMulticast = multi;
    this.lookupMsgSTL = stl;
    this.iceCandidateReceived = {};
    //called like that for being compatible with PeerJS
    this.socket = {};
    this.socket.send = function(msg){ self.send(msg); };
  }
  
  LookupService.prototype.apply = function(msg){
    var target = msg.receiver;    
    this.setPathAndIceCandidates(target, true, undefined, undefined, false);
    if(!this.gossipMsgsToSend[target]){ this.gossipMsgsToSend[target] = []; }
    this.gossipMsgsToSend[target].push(msg);
    var dc = new exports.DataConnection(target, this,{serialization: 'json'});
    this.connections[target] = dc;
    
    var self = this;
    dc.on('open', function(){
      console.info('DC object');
      console.info(dc);
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
  
  LookupService.prototype.setPathAndIceCandidates = function(target, originator, path, steps, firstRec){
    this.discoveredPaths[target] = {
      'originator': originator, 'path': path, 'steps': steps, 'firstRec': firstRec
    };
    this.iceCandidateReceived[target] = {
      received: false, candidate: undefined
    };
  };
  
  LookupService.prototype.dispatch = function(msg){
    if(msg.steps < this.lookupMsgSTL){
      var con;
      this.log.info('Dispatching message: ' + msg.type);
      switch(msg.type){
        case 'REQ':
          if(msg.target === this.id){
            this.log.info('Target reached in REQ msg');
            if(!this.discoveredPaths[msg.emitter]){
              this.setPathAndIceCandidates(msg.emitter, false, msg.path, msg.steps, true);
              this.inOfferReception(msg);
            }else{
              //TODO maintaining more than one path could be better
              this.log.warn('There is already a path to: ' + msg.emitter +
                ', ignoring new path');
            }
          }else{
            msg.path.push(this.id);
            msg.steps++;
            this.log.info('Target was not reached for msg REQ, fordwarding msg to: '+
              msg.path[msg.steps -1] + ' via brodcast');
            this.broadcast(msg, msg.path[msg.steps - 1]);
          }
          break;
        case 'ANSW':
          if(msg.target === this.id){
            this.log.info('Target reached in ANSW msg');
            var pathInfo = this.discoveredPaths[msg.emitter];
            if(pathInfo.originator && !pathInfo.firstRec){
              pathInfo.firstRec = true;
              pathInfo.path = msg.path;
              msg.type = 'ANSWER';
              con = this.getConnection(msg.emitter);
              if(con){
                //DataConnection.handleMessage() in PeerJS
                this.log.info('Handling answer via DataConnection');
                con.handleMessage(msg);
              }else
                this.log.error('ANSWER reception ignored cos the connection dissapears');
            }else{
              this.log.info('Ignoring messge cos one path was already found');
            }
            //here the request is igonered because the target was already removed from
            //LookupService.waitingPathFor. This is actually the end of the lookup.
            //TODO maintaining different paths for the same target could be better
            //due to peers dinamicity; in the near future LookupService will could into
            //a DHT or another P2P data structure
          }else{
            msg.steps--;
            con = this.getConnection(msg.path[msg.steps]);
            this.log.info('Target was not reached for answer, forward message to: '+
              msg.path[msg.steps]);
            if(con){
              this.log.info('Sending msg...');
              con.send(msg);
            }else
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
    }else
      this.log.warn('The next message will be ignored: ' + JSON.stringify(msg));
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
    this.log.info('Offer reception');
    var self = this;
    var payload = msg.payload;
    var dc = new exports.DataConnection(msg.emitter, this, {
      connectionId: payload.connectionId,
      _payload: payload,
      metadata: payload.metadata,
      label: payload.label,
      serialization: payload.serialization,
      reliable: payload.reliable
    });
    this.connections[msg.emitter] = dc;
    this.log.info('Setting events of connection at LookupService');
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
    this.log.info('LookupService.send called with msg: ' + JSON.stringify(msg));
    var outMsg, path, steps, connection;
    switch(msg.type){
      case 'OFFER':
        outMsg = this.createLoUpMsg('REQ', [this.id], 0, msg.dst, msg.payload);
        this.broadcast(outMsg, undefined);
        break;
      case 'ANSWER':
        path = this.discoveredPaths[msg.dst].path;
        steps = this.discoveredPaths[msg.dst].steps;
        if(path && steps){
          outMsg = this.createLoUpMsg('ANSW', path, steps, msg.dst, msg.payload);
          connection = this.getConnection( path[steps] );
          if(connection){
            this.log.info('Sending answer');
            connection.send(outMsg);
          }else{
            this.log.error('Link between ' + this.id + ' and ' + loUpMsg.path[loUpMsg.steps]+
              'is broken. Answer is lost.');
          }
        }else
          this.log.error('Entry for emitter: ' + msg.dst + ' is lost, why?');
        break;
      case 'CANDIDATE':
        this.log.info('Ice candidate received for connection with: ' + msg.dst);
        var ice = this.iceCandidateReceived[msg.dst];
        if(ice){
          if(!ice.received){
            this.log.info('Storing candidate...');
            ice.received = true;
            ice.candidate = msg.payload;
            //TODO check if paths are available
          }
          //In both sides of the communication just one ICE candidate is set up,
          //normally the browser provides a set of ICE candidates and the cost of
          //forward them via the LookupService is higher
        }else
          this.log.error('Storage of candidates was not initialized');
        //if(!ice.received && path){
        //  ice.received = true;
        //  ice.candidate = msg.payload;
        //  if(this.discoveredPaths[msg.dst].originator){
        //    outMsg = this.createLoUpMsg('PING', path, 1, msg.dst, msg.payload);
        //    connection = this.getConnection(path[1]);
        //    if(connection)
        //      connection.send(outMsg);
        //    else
        //      this.log.error('Ice candidate was not sent, fist link is broken');
        //  }else{
        //    steps = this.discoveredPaths[msg.dst].steps;
        //    outMsg = this.createLoUpMsg('PONG', path, steps, msg.dst, msg.payload);
        //    connection = this.getConnection(path[steps]);
        //    if(connection)
        //      connection.send(outMsg);
        //    else
        //      this.log.error('Ice candidate was not sent, last link is broken');
        //  }
        //}
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
    window.setTimeout(function(){
      self.log.info('Later broadcast called');
      self.broadcast(msg);
    }, 5000);
  };
  
  LookupService.prototype.broadcast = function(msg, emitterToAvoid){
    this.log.info('Broadcast with msg: ' + JSON.stringify(msg));
    var keys = Object.keys(this.peerCons), i, sentMsgs = 0, con, self = this;
    if(keys.length === 0)
      this.log.warn('No connections at Peer');
    else{
      for(i = 0; i < keys.length; i++){
        if(keys[i] !== emitterToAvoid){
          con = this.peerCons[ keys[i] ][0];
          if(con){
            if(sentMsgs < this.lookupMulticast){
              this.log.info('Connection with: ' + keys[i] + ' at Peer');
              if(con.open){
                sentMsgs++;
                this.log.info('Sending msg');
                con.send(msg);
              }else{
                this.log.info('Connection with: ' + con.peer + ' is not ready yet');
              }
            }else{
              this.log.info('lookupMulticast value was reached, end of retransmition');
              return;
            }
          }
        }
      }
    }
    keys = Object.keys(this.connections);
    if(keys.length === 0){
      this.log.warn('No connections at LookupService, end of retransmition');
      return;
    }else{
      for(i = 0; i < keys.length; i++){
        if(keys[i] !== emitterToAvoid){
          con = this.connections[ keys[i] ];
          if(con){
            if(sentMsgs < this.lookupMulticast){
              if(con.open){
                this.log.info('Connection with ' + keys[i] + ' at LookupService');
                sentMsgs++;
                con.send(msg);
              }else{
                this.log.info('Connection with: ' + con.peer + ' is not ready yet');
              }
            }else{
              this.log.info('lookupMulticast value was reached, end of retransmition');
              return;
            }
          }
        }
      }
    }
    this.log.info('Broadcast is done');
  };
  exports.LookupService = LookupService;
})(this);
