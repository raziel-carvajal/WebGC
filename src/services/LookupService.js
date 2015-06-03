/**
* @module src/services*/
(function(exports){
  /**
  * @class LookupService
  * @description This class replace some functionalities, aka  signaling, of the 
  * [brokering server]{@link https://github.com/peers/peerjs-server} to perform connections 
  * with other peers. Before talking about how the LookupService works, let's considered that the
  * local peer has performed sucessfully one connection with another peer thanks to the bootstrap
  * procedure (see [Bootstrap]{@link module:src/services#Bootstrap}) and now the local peer needs
  * to create a new connection with another peer P, which belogs to the first view given by the
  * Bootstrap service. The LookupService works as follows:
  * i) To reach P one lookup message L will be sent to at most "lookupMulticast" peers. L contains
  * metadata (compose of one OFFER and one ICE candidate) to perform a WebRTC data connection between
  * P and the local peer
  * ii) When L reaches P, the path that L traveled (hops among peers) across the overlay is stored
  * by P and a new lookup message L1 is created (the metadata on this message is composed of an
  * ANSWER and one ICE candidate) to reply the WebRTC connection request
  * iii) Finally, L1 will be sent to the local peer to complete the connection request
  *
  * For your information, this class keeps an strong dependency with some classes of 
  * [PeerJS]{@link http://peerjs.com/} particularly the 
  * [DataConnection]{@link http://peerjs.com/docs/#dataconnection} class. 
  * @param log Logger (see [LoggerForWebWorker]{@link module:src/utils#LoggerForWebWorker}) to
  * monitor the actions of the LookupService
  * @param peerCons Object that contains any connection performed with the help of the brokering server
  * @param handleConFn This function sets the events of one connection for knowing what to do
  * when the connection is ready, when there is an error or when data is received
  * @param id Local peer unique indentifier
  * @param peerJSopts Object with the settings for PeerJS, which is cointained in the property
  * "peerJsOpts" of the [configuration object]{@link module:src/confObjs#configurationObj}
  * @param multi Maximum number of peers to send a lookup message
  * @param stl Apart from the emitter of a lookup messages, peers in the overlay forward it to
  * reach the receiver; for avoiding an infinite retransmition, this counter tells how many
  * times lookup messages can be forwarded
  * @param inDataFunc Function to handle any incoming data of one connection peformed by the 
  * LookupService*/
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
  
  /**
  * @method apply
  * @description This method triggers the lookup service, when the constructor of the
  * [DataConnection]{@link http://peerjs.com/docs/#dataconnection} is called 
  * eventually the "send" method on this file is called twice, once to return the
  * WebRTC offer and the second one to return ICE candidates.
  * @param msg Payload to send as soon as a new connection with another peer is created*/
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
  
  /**
  * @method setPathAndIceCandidates
  * @description Stores one lookup message 
  * @param target Identifier of the peer to reach
  * @param originator Determines whether or no the peer who creates this lookup message is the originator
  * of the connection request
  * @param path Array of peer identifiers that represents one path in the overlay to reach two peers
  * @param steps Number of current hops in the path
  * @param sentFirstTime Determines whether or no one lookup message to reach the target was created
  * for the first time*/
  LookupService.prototype.setPathAndIceCandidates = function(target, originator, path,
    steps, sentFirstTime){
    this.discoveredPaths[target] = {
      'originator': originator, 'path': path, 'steps': steps,
      'sentFirstTime': sentFirstTime, offer: undefined, 
      answer: undefined, iceCandidates: [], firstReception: false
    };
  };
  
  /**
  * @method dispatch
  * @description Handles the reception of lookup messages, there are two types for these messages:
  * answers and requests. While requests are created for the emitters of connections, answers are
  * created by receivers as a response of one request. In one hand, when one request is received by a peer two
  * actions can take place, if the peer is the target then one answer is forwarded to the penultimate 
  * entry of the path (array in the request message), otherwise the peer includes its identifier the path
  * and forwards the request to at most "lookupMulticast" peers. On the other hand, if one answer reaches
  * its target then one WebRTC data connection will be performed, otherwise the answer is forwarded according
  * to the order given by the path field of the answer.
  * @param msg Lookup message, the content of this object could be reviewed in the "createLoUpMsg"
  * method*/
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
              //due to peers dinamicity; in the near future LookupService will could turn into
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
  
  /**
  * @method inOfferReception
  * @description This method is called when an offer reaches its target peer, one 
  * [DataConnection]{@link http://peerjs.com/docs/#dataconnection} is initialized and
  * eventually the "send" method on this file is called twice, once to return the
  * WebRTC answer and the second one to return ICE candidates.
  * @param msg Lookup message made by the emitter of one connection request*/
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
 
  /**
  * @method createLoUpMsg
  * @description Returns one object with the attributes of one lookup message
  * @param type String with two posibble values: REQ or ANSW
  * @param path Array of peer identifiers that represents one path in the overlay to reach two peers
  * @param steps Number of current hops in the path
  * @param target Peer to reach
  * @param payload Metadata (offer, answer and/or ICE candidates) to set one WebRTC data connection
  * @return Object Object with the attributes of one lookup message*/
  LookupService.prototype.createLoUpMsg = function(type, path, steps, target, payload){
    return{
      service: 'LOOKUP', 'type': type, 'path': path,
      'steps': steps, 'target': target, emitter: this.id,
      'payload': payload
    };
  };
  
  /**
  * @method send
  * @description This method is triggered by the internals of the 
  * [DataConnection]{@link http://peerjs.com/docs/#dataconnection} class in two cases: when
  * one WebRTC offer/answer is created or when ICE candidates are given to configure one
  * connection with two peers.
  * @param msg Object with metadata to perform a WebRTC connection between two peers*/
  LookupService.prototype.send = function(msg){
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
  
  /**
  * @method getConnection
  * @description Search for one connection in the internals of the
  * [Peer]{@link http://peerjs.com/docs/#peer} class or in the connections peformed by the
  * lookup service.
  * @param peerId Peer identifier to perform a connection with
  * @return Object [DataConnection]{@link http://peerjs.com/docs/#dataconnection}*/
  LookupService.prototype.getConnection = function(peerId){
    if(this.peerCons[peerId] && this.peerCons[peerId][0])
      return this.peerCons[peerId][0];
    else if(this.connections[peerId])
      return this.connections[peerId];
    else
      this.log.error('Connection to ' + peerId + ' is closed or does not exist');
    return;
  };
  
  /**
  * @method broadcast
  * @description Forwards one lookup message to "lookupMulticast" peers if the number of times the message
  * has been shared in the overlay does not reach "lookupMsgSTL" steps.
  * @param msg Lookup message to forward
  * @param emitterToAvoid Identifier of the lookup message emmiter when the message has not reached its 
  * target and the message has been shared for at least one time*/
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
