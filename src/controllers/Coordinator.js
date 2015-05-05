/**
* @module lib/controllers*/
(function(exports){
  /**
  * @class Coordinator
  * @augments Peer
  * @description This class coordinates the execution of a set of gossip-based protocols. The
  * protocols are described in a configuration object, this object is the only parameter in
  * the constructor of the Coordinator object. Like every executor in the current module, 
  * this executor is a sub-class of the Peer object (from PeerJS). When an object of this 
  * class is created a unique ID will be requested to an instance of the PeerServer object 
  * in order to bootstrap the exchange of messages with WebRTC. When the constructor of the
  * Peer object is lunched a "get identifier" request is performed.
  * @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr> */
  function Coordinator(opts, profile, peerId){
    if(!(this instanceof Coordinator)){ return new Coordinator(opts, profile, peerId); }
    if(!this.checkConfFile(opts)){ return; }
    this.profile = profile;
    this.peerId = peerId;
    this.log = new Logger(opts.logOpts);
    this.gossipUtil = new GossipUtil(this.log);
    this.factory = new GossipFactory({ 'log': this.log, 'gossipUtil': this.gossipUtil });
    this.peerJsOpts = opts.peerJsOpts;
    this.gossipAlgos = opts.gossipAlgos;
    //this.withWw = opts.usingWebWorkers;
    if(!this.log.isActivated){
      this.actCycHistory = {};
      this.vieUpdHistory = {};
    }
    this.lookupMulticast = opts.lookupMulticast;
    this.lookupMsgSTL = opts.lookupMsgSTL;
    this.usingSs = opts.usingSs;
    this.bootstrapTimeout = opts.bootstrapTimeout;
    var self = this;
    this.sendTo = function(msg){
      if(self.usingSs)
        self.sendViaSigServer(msg);
      else{
        if(msg.service !== 'VOID')
          self.sendViaLookupService(msg);
        else
          self.sendViaSigServer(msg);  
      }
    };
    this.inDataFunc = function(msg){ self.handleIncomingData(msg); };
    this.inHandleCon = function(c){ self.handleConnection(c); };
  }
  
  util.inherits(Coordinator, Peer);
  
  Coordinator.prototype.listen = function(){
    this.isIdRandom = false;
    if(typeof this.peerId !== 'undefined'){
      Peer.call(this, this.peerId, this.peerJsOpts);
      this.log.header = 'Coordinator_' + this.peerId;
      this.factory.peerId = this.peerId;
    }else{
      Peer.call(this, this.peerJsOpts);
      this.isIdRandom = true;
    }
    if(!this.usingSs){
      this.isFirstConDone = false;
      this.lookupService = new LookupService(this.log, this.connections,
        this.inHandleCon, this.id, this.peerJsOpts, this.lookupMulticast,
        this.lookupMsgSTL, this.inDataFunc);
    }
    
    var self = this;
    /**
    * @event open
    * @description When the peer is ready to communicate this event is fired. Events are
    * possible because the Coordinator inherits from Peer.EventEmitter of PeerJS.*/
    this.on('open', function(id){
      self.bootService = new Bootstrap(self);
      if(self.isIdRandom){
        self.peerId = id;
        self.log.header = 'Coordinator_' + id;
        self.factory.peerId = id;
      }
      self.log.info('Peer is ready to listen external messages');
      self.log.info('Algorithms initialization');
      self.createAlgorithms();
      self.log.info('Doing bootstrap');
      self.bootService.bootstrap();
    });
    /**
    * @event connection
    * @description This event is fired when an external message is received.*/
    this.on('connection', function(c){ self.handleConnection(c); });
  };
  
  Coordinator.prototype.createAlgorithms = function(){
    var algosNames = Object.keys(this.gossipAlgos), algOpts, worker;
    for(var i = 0; i < algosNames.length; i++){
      algOpts = this.gossipAlgos[ algosNames[i] ];
      algOpts.data = this.profile;
      this.factory.createProtocol(algosNames[i], algOpts);
      worker = this.factory.inventory[ algosNames[i] ];
      if(worker !== 'undefined')
        this.setWorkerEvents(worker);
      else
        this.log.error('worker: ' + algosNames[i] + ' is not defined');
      if(!this.log.isActivated){
        this.actCycHistory[ algosNames[i] ] = {};
        this.vieUpdHistory[ algosNames[i] ] = {};
      }
    }
    this.workers = this.factory.inventory;
  };
  //
  Coordinator.prototype.checkConfFile = function(confObj){
    console.info('Cecking configuration file...');
    try{
      var opts = confObj.peerJsOpts;
      if(!opts.hasOwnProperty('host') || !opts.hasOwnProperty('port'))
        throw 'Host and/or port of signaling server is absent';
      var keys = Object.keys(confObj.gossipAlgos);
      for(var i = 0; i < keys.length; i++){
        if(!confObj.gossipAlgos[ keys[i] ].hasOwnProperty('class'))
          throw 'Class name of the protocol is absent';
      }
      console.info('configuration file is well formed');
    }catch(e){
      console.error('Configuration file is malformed. ' + e.message);
      return;
    }
    return true;
  };
  //
  Coordinator.prototype.setWorkerEvents = function(worker){
    var self = this;
    
    worker.addEventListener('message', function(e){
      var msg = e.data, worker;
      switch(msg.header){
        case 'outgoingMsg':
          self.log.info('OutgoingMsg to reach: ' + msg.receiver + ' with algoId: ' + msg.algoId);
          self.sendTo(msg);
          break;
        case 'getDep':
          worker = self.workers[msg.depId];
          if(worker !== 'undefined')
            worker.postMessage(msg);
          else
            self.log.error('there is not a worker for algorithm: ' + msg.depId);
          break;
        case 'setDep':
          worker = self.workers[msg.emitter];
          if(worker !== 'undefined'){
            msg.header = 'applyDep';
            worker.postMessage(msg);
          }else
            self.log.error('there is not a worker for algorithm: ' + msg.emitter);
          break;
        case 'drawGraph':
          if(typeof self.plotterObj !== 'undefined')
            self.plotterObj.buildGraph(msg.algoId, msg.graph, msg.view);
          else
            self.log.warn('graph obj is not defined, msg to graph was: ' + JSON.stringify(msg));
          break;
        //Logging to which extend the view of each algo is updated and which
        //is the overload in gossip cycles with the use of web workers
        case 'actCycLog':
          if(self.actCycHistory){
            self.actCycHistory[msg.algoId][msg.counter] = {
              algoId: msg.algoId,
              loop: msg.loop,
              offset: msg.offset
            };
          }
          break;
        case 'viewUpdsLog':
          self.vieUpdHistory[msg.trace.algoId][msg.counter] = msg.trace;
          break;
        case 'logInConsole':
          console.log("WebGClog &&" + msg.log + "&&");
          break;
        default:
          console.error('message: ' + msg.header + ' is not recoginized');
          self.log.warn('message: ' + msg.header + ' is not recoginized');
          break;
      }
    }, false);
    
    worker.addEventListener('error', function(e){
      self.log.error('In Worker: ' + e.message + ', lineno: ' + e.lineno);
    }, false);
  };
  
  Coordinator.prototype.getViewUpdHistory = function(){ return this.vieUpdHistory; };
  Coordinator.prototype.getActiCycHistory = function(){ return this.actCycHistory; };
  
  Coordinator.prototype.emptyHistoryOfLogs = function(){
    var keys = Object.keys(this.vieUpdHistory);
    for(var i = 0; i < keys.length; i++){
      delete this.vieUpdHistory[ keys[i] ];
      this.vieUpdHistory[ keys[i] ] = {};
    }
    keys = Object.keys(this.actCycHistory);
    for(i = 0; i < keys.length; i++){
      delete this.actCycHistory[ keys[i] ];
      this.actCycHistory[ keys[i] ] = {};
    }
  };
  
  Coordinator.prototype.setLogFunction = function(func){ this.logFunc = func; };
  
  Coordinator.prototype.sendViaSigServer = function(msg){
    var self = this;
    //Peer.connect
    var connection = this.connect(msg.receiver, {serialization: 'json'});
    
    connection.on('open', function(){
      self.log.info('Connection open, sending msg: ' + msg.service +
        ' to: ' + msg.receiver);
      if(!self.usingSs)
        self.isFirstConDone = true;
      connection.send(msg);
      
      connection.on('data', function(data){ self.handleIncomingData(data); });
      
      connection.on('error', function(e){
        self.log.error('In communication with: ' + connection.peer +
          ' (call sendViaSigServer); ' + e);
      });
    });
    
    connection.on('error', function(e){
      self.log.error('Trying to connect with: ' + msg.receiver + '; ' + e);
    });
  };
  
  Coordinator.prototype.sendViaLookupService = function(msg){
    //Peer.connections = this.connections
    this.log.info('Trying to send msg: ' + msg.service + ' to: ' + msg.receiver +
      ' with existing connections');
    if(!this.isFirstConDone){
      this.log.info('Doing first connection via the signaling server');
      this.sendViaSigServer(msg);
      return;
    }else{
      //Peer.connections
      var connections = this.connections[msg.receiver], con;
      if(connections){
        this.log.info('Peer.connections is not empty, searching at least one connection open');
        for(var i = 0; i < connections.length; i++){
          con = connections[i];
          if(con){
            this.log.info('Connection with: ' + msg.receiver + ' at Peer was found');
            if(con.open){
              this.log.info('Sending message');
              con.send(msg);
              return;
            }else
              this.log.info('Connection in Peer is still not ready');
          }
        }
      }
      this.log.info('Any connection available at Peer, checking LookupService');
      con = this.lookupService.connections[msg.receiver];
      if(con){
        this.log.info('Connection with: ' + msg.receiver + ' at LookupService was found');
        if(con.open){
          this.log.info('Sending message');
          con.send(msg);
          return;
        }else
          this.log.info('Connection in LookupService is still not ready');
      }else
        this.log.info('Any connection available at Lookup, doing lookup service');
      this.lookupService.apply(msg);
    }
  };
  /**
  * @method handleConnection
  * @description This method performs the passive thread of each gossip-based protocol in the object 
  * Coordinator.protocols
  * @param {DataConnection} connection - This connection allows the exchange of meesages amog peers. */
  Coordinator.prototype.handleConnection = function(connection){
    if(!this.isFirstConDone)
      this.isFirstConDone = true;
    var self = this;
    
    connection.on('open', function(){
      self.log.info('Bi-directional communication with: ' + connection.peer + ' is ready');
      //adding new flag to DataConnection object
      //connection.readyToSend = true;
    });
    
    connection.on('data', function(data){ self.handleIncomingData(data); });
    
    connection.on('error', function(err){
      self.log.error('In communication with: ' + connection.peer +
        ' (call handleConnection); ' + err);
    });
  };
  
  Coordinator.prototype.handleIncomingData = function(data){
    this.log.info('External message received, msg: ' + JSON.stringify(data));
    switch(data.service){
      case 'LOOKUP':
        this.lookupService.dispatch(data);
        break;
      case 'GOSSIP':
        var worker = this.workers[data.algoId];
        //this.log.info('worker: ' + data.algoId + ', msg received: ' + JSON.stringify(data));
        var msg = {
          header: 'incomingMsg',
          payload: data.payload,
          receptionTime: new Date()
        };
        worker.postMessage(msg);
        break;
      case 'VOID':
        this.log.info('VOID was received from: ' + data.emitter);
        break;
      default:
        this.log.error('Msg: ' + JSON.stringify(data) + ' is not recognized');
        break;
    }
  };
  
  exports.Coordinator = Coordinator;
})(this);
