(function(exports){
  
  function LookupService(log, peerCons, handleConFn, id, peerJSopts, multi, stl, inDataFunc){
    if(!(this instanceof LookupService))
      return new LookupService(log, peerCons, handleConFn, id, peerJSopts, multi, stl, inDataFunc);
    var self = this;
    this.log = log;
    this.peerCons = peerCons;
    this.connections = {};
    this.gossipMsgsToSend = {};
    this.discoveredPaths = {};
    //coping with connections
    this.handleConnection = handleConFn;
    //coping with payloads (LOOKUP or GOSSIP)
    this.handleIncomingData = inDataFunc;
    //Peer.id (local ID)
    this.id = id;
    this.options = peerJSopts;
    this.lookupMulticast = multi;
    this.lookupMsgSTL = stl;
    //called like that for being compatible with PeerJS
    this.socket = {};
    this.socket.send = function(msg){ self.send(msg); };
  }
  
  LookupService.prototype.apply = function(msg){
    var target = msg.receiver;
    if(this.discoveredPaths[target]){
      this.log.info('Handshake was already initated with: ' + target +
        ', enqueueing message');
      if(!this.gossipMsgsToSend[target]){ this.gossipMsgsToSend[target] = []; }
      this.gossipMsgsToSend[target].push(msg);
    }else{
      this.setPathAndIceCandidates(target, true, undefined, undefined, false);
      if(!this.gossipMsgsToSend[target]){ this.gossipMsgsToSend[target] = []; }
      this.gossipMsgsToSend[target].push(msg);
      var dc = new exports.DataConnection(target, this, {serialization: 'json'});
      this.connections[target] = dc;
      
      var self = this;
      dc.on('open', function(){
        self.log.info('Handshake done, sending msgs in queue to: ' + dc.peer);
        var queue = self.gossipMsgsToSend[dc.peer];
        for(var i = 0; i < queue.length; i++){
          self.log.info('Sending msg: ' + JSON.stringify(queue[i]));
          dc.send(queue[i]);
        }
        self.gossipMsgsToSend[dc.peer] = [];
        
        dc.on('data', function(data){
          self.log.info('Msg received via Lookup connection');
          self.handleIncomingData(data);
        });
      });
      
      dc.on('error', function(e){
        self.log.error('In connection between ' + self.id + ' and ' + dc.peer + '. ' + e);
      });
    }
  };
  
  LookupService.prototype.setPathAndIceCandidates = function(target, originator, path,
    steps, sentFirstTime){
    this.discoveredPaths[target] = {
      'originator': originator, 'path': path, 'steps': steps,
      'sentFirstTime': sentFirstTime, offer: undefined, 
      answer: undefined, iceCandidates: [], firstReception: false
    };
  };
  
  LookupService.prototype.dispatch = function(msg){
    this.log.info('Dispatching message: ' + msg.type + ', to reach peer: ' + msg.target);
    if(msg.steps < this.lookupMsgSTL){
      var con, pathInfo;
      switch(msg.type){
        case 'REQ':
          msg.path.push(this.id);
          if(msg.target === this.id){
            this.log.info('Target reached in REQ msg');
            pathInfo = this.discoveredPaths[msg.emitter];
            if(!pathInfo){
              this.setPathAndIceCandidates(msg.emitter, false, msg.path, msg.steps, undefined);
              console.info('RECP');
              console.info(msg);
              this.inOfferReception(msg);
            }else
              this.log.warn('Already a path to: ' + msg.emitter + ', ignoring path');
          }else{
            msg.steps++;
            this.log.info('Target was not reached for msg REQ, forwarding msg to reach peer: '+
              msg.target + ' via brodcast');
            this.broadcast(msg, msg.path[msg.steps - 1]);
          }
          break;
        case 'ANSW':
          if(msg.target === this.id){
            this.log.info('Target reached in ANSW msg, updating path');
            pathInfo = this.discoveredPaths[msg.emitter];
            if(pathInfo && !pathInfo.firstReception){
              pathInfo.firstReception = true;  pathInfo.path = msg.path;
              con = this.getConnection(msg.emitter);
              if(con){
                var msge = { type: 'ANSWER', payload: msg.payload.answer.payload };
                this.log.info('Setting answer to reach: ' + msg.emitter);
                con.handleMessage(msge);
                msge = {}; msge = { type: 'CANDIDATE' };
                this.log.info('Setting iceCandidates to reach: ' + msg.emitter);
                for(var i = 0; i < msg.payload.iceCandidates.length; i++){
                  msge.payload = msg.payload.iceCandidates[i];
                  con.handleMessage(msge);
                }
              }else{ this.log.error('ANSWER reception ignored cos the connection dissapears'); }
            }else{
              this.log.info('Ignoring messge cos one path was already found');
              //here the request is igonered because the target was already removed from
              //LookupService.waitingPathFor. This is actually the end of the lookup.
              //TODO maintaining different paths for the same target could be better
              //due to peers dinamicity; in the near future LookupService will could into
              //a DHT or another P2P data structure
            }
          }else{
            msg.steps--;
            con = this.getConnection(msg.path[msg.steps]);
            this.log.info('Target was not reached for answer, forwarding message via: '+
              msg.path[msg.steps]);
            if(con){ con.send(msg); }
            else{ this.log.error('ANSW transmition to emitter is lost. Msg: ' + JSON.stringify(msg)); }
          }
          break;
        default:
          this.log.error('Lookup msg is not recognized. Msg: ' + JSON.stringify(msg));
          break;
      }
    }else{ this.log.warn('The next message will be ignored: ' + JSON.stringify(msg)); }
  };
  
  LookupService.prototype.inOfferReception = function(msg){
    this.log.info('REQ reception to reach: ' + msg.emitter);
    var self = this;
    var payload = msg.payload.offer.payload;
    this.log.info('Setting offer to reach: ' + msg.emitter);
    var dc = new exports.DataConnection(msg.emitter, this, {
      connectionId: payload.connectionId,
      _payload: payload,
      metadata: payload.metadata,
      label: payload.label,
      serialization: payload.serialization,
      reliable: payload.reliable
    });
    this.connections[msg.emitter] = dc;
    this.log.info('Setting iceCandidates to reach: ' + msg.emitter);
    for(var msge, i = 0; i < msg.payload.iceCandidates.length; i++){
      msge = {
        //type: msg.payload.iceCandidates[i].type,
        type: 'OFFER',
        payload: msg.payload.iceCandidates[i]
      };
      dc.handleMessage(msge);
    }
    this.log.info('Setting events to communicate with: ' + msg.emitter);
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
    console.info('SEND');
    console.info(msg);
    this.log.info('LookupService.send called with msg: ' + msg.type + ' to reach: ' + msg.dst);
    var lookupInfo = this.discoveredPaths[msg.dst], outMsg, path, steps, connection;
    switch(msg.type){
      case 'OFFER':
        if(lookupInfo){
          this.log.info('Setting offer');
          lookupInfo.offer = msg;
        }else{ this.log.error('Peer: ' + msg.dst + ' does not have to wait an offer'); }
        break;
      case 'ANSWER':
        if(lookupInfo){
          this.log.info('Setting answer');
          lookupInfo.answer = msg;
        }else{ this.log.error('Peer: ' + msg.dst + ' does not have to wait an answer'); }
        break;
      case 'CANDIDATE':
        if(lookupInfo){
          this.log.info('Updating list of iceCandidates');
          lookupInfo.iceCandidates.push(msg.payload);
          if(lookupInfo.iceCandidates.length > 1 && !lookupInfo.sentFirstTime){
            this.log.info('There is more than one candidate, sending request');
            lookupInfo.sentFirstTime = true;
            if(lookupInfo.originator){
              this.log.info('Catching iceCandidate in OFFER');
              outMsg = this.createLoUpMsg('REQ', [this.id], 0, msg.dst, {
                offer: lookupInfo.offer, iceCandidates: lookupInfo.iceCandidates });
              this.log.info('Doing broadcast with msg REQ to reach: ' + msg.dst);
              this.broadcast(outMsg, undefined);
            }else{
              this.log.info('Catching iceCandidate in ANSWER');
              path = this.discoveredPaths[msg.dst].path;
              steps = this.discoveredPaths[msg.dst].steps;
              if(path && steps){
                outMsg = this.createLoUpMsg('ANSW', path, steps, msg.dst, {
                  answer: lookupInfo.answer, iceCandidates: lookupInfo.iceCandidates });
                connection = this.getConnection( path[steps] );
                if(connection){
                  this.log.info('Forwarding answer via: ' + path[steps]);
                  connection.send(outMsg);
                }else{
                  this.log.error('Link between ' + this.id + ' and ' + loUpMsg.path[loUpMsg.steps]+
                    'is broken. Answer is lost.');
                }
              }else
                this.log.error('Entry for emitter: ' + msg.dst + ' is lost, why?');
            }
          }else if(lookupInfo.sentFirstTime)
            this.log.warn('Other candidates are received once the REQ was sent');
          else{ this.log.info('iceCandidates are still not enough'); }
        }else{ this.log.error('Peer: ' + msg.dst + ' does not have to wait iceCandidates'); }
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
  
  LookupService.prototype.broadcast = function(msg, emitterToAvoid){
    var keys = Object.keys(this.peerCons), i, sentMsgs = 0, con, self = this;
    if(keys.length === 0)
      this.log.warn('No connections at Peer, checking connections open at LookupService');
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
              }else
                this.log.warn('Connection with: ' + con.peer + ' at Peer is not ready yet');
            }else{
              this.log.info('lookupMulticast value was reached, end of retransmition');
              return;
            }
          }else
            this.log.error('Connection does not exist');
        }
      }
    }
    keys = Object.keys(this.connections);
    if(keys.length === 0){
      this.log.warn('No connections at LookupService, multicas will not be performed');
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
                this.log.info('Sending msg');
                con.send(msg);
              }else
                this.log.warn('Connection with: ' + con.peer + ' at LookupService is not ready yet');
            }else{
              this.log.info('lookupMulticast value was reached, end of retransmition');
              return;
            }
          }else
            this.log.error('Connection does not exist');
        }
      }
    }
  };
  
  exports.LookupService = LookupService;
})(this);
