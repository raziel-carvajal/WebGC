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
    if( !this.checkConfFile(opts) ) return;
    this.profile = profile;
    this.peerId = peerId;
    //opts.logOpts.header = 'Coordinator_' + opts.peerId;
    this.log = new Logger(opts.logOpts);
    this.gossipUtil = new GossipUtil(this.log);
    this.factory = new GossipFactory({ 'log': this.log, 'gossipUtil': this.gossipUtil });
    this.peerJsOpts = opts.peerJsOpts;
    this.gossipAlgos = opts.gossipAlgos;
    this.withWw = opts.usingWebWorkers;
  }
  
  util.inherits(Coordinator, Peer);
  
  Coordinator.prototype.listen = function(){
    var self = this;
    this.isIdRandom = false;
    /**
    * This method fires the constructor of the [Peer]{@link Peer} object.*/
    if(typeof this.peerId !== 'undefined'){
      Peer.call(this, this.peerId, this.peerJsOpts);
      this.log.header = 'Coordinator_' + this.peerId;
      this.factory.peerId = this.peerId;
    }else{
      Peer.call(this, this.peerJsOpts);
      this.isIdRandom = true;
    }
    /**
    * @event Coordinator#open
    * Once the [PeerServe]{@link PeerServer} gives an [id]{@link id} to the local peer
    * the function in this event is performed. */
    this.on('open', function(id){
      if(self.isIdRandom){
        self.peerId = id;
        self.log.header = 'Coordinator_' + id;
        self.factory.peerId = id;
      }
      self.log.info('Peer is ready to listen external messages');
      self.log.info('Algorithms initialization...');
      self.createAlgorithms();
      self.log.info('posting profile...');
      self.postProfile();
      self.log.info('Getting first view...');
      window.setTimeout(function(){ self.getFirstView(); }, 5000);
    });
    /**
    * @event Coordinator#connection
    * @description This event is fired when a remote peer contacts the local peer via 
    * [the method]{@link DataConnection#send}. The actions of this event are linked with 
    * [the method]{@link ClusteringExecutor#handleConnection}. */
    this.on('connection', function(c){ self.handleConnection(c); });
  };
  //
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
      if(!confObj.hasOwnProperty('usingWebWorkers'))
        throw 'Option for using web-workers or not is missing';
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
      self.log.info('local message received: ' + JSON.stringify(msg));
      switch(msg.header){
        case 'activeMsg':
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
          self.plotterObj.buildGraph(msg.type, msg.graph, msg.view);
          break;
        default:
          break;
      }
    }, false);
    
    worker.addEventListener('error', function(e){
      self.log.error('In Worker: ' + e.message + ', lineno: ' + e.lineno);
    }, false);
  };
  
  Coordinator.prototype.sendTo = function(msg){
    var self = this;
    var connection = this.connect(msg.receiver, {label: msg.algoId});
    connection.on('error', function(e){
      self.log.error('while sending view to: ' + msg.receiver + ', in protocol: ' + msg.algoId);
    });
    connection.on('open', function(){
      connection.send(msg.payload);
    });
  };
  /**
  * @method handleConnection
  * @description This method performs the passive thread of each gossip-based protocol in the object 
  * Coordinator.protocols
  * @param {DataConnection} connection - This connection allows the exchange of meesages amog peers. */
  Coordinator.prototype.handleConnection = function(connection){
    var worker = this.workers[connection.label];
    var self = this;
    connection.on('data', function(data){
      self.log.info('worker: ' + connection.label + ', msg received: ' + JSON.stringify(data));
      var msg = {
        header: 'passiveMsg',
        emitter: connection.peer,
        payload: data
      };
      worker.postMessage(msg);
    });
    connection.on('error', function(err){
      self.log.error('During the reception of a ' + protocol.protoId + ' message');
    });
  };
  /** 
  * @method doActiveThread
  * @description This method performs the active thread of each gossip-based protocol in the 
  * Coordinator.protocols object.*/
  //Coordinator.prototype.doActiveThread = function(protocol){
  //  var logi = protocol.protoId + '_' + protocol.loop + '_' + this.id + '_' + protocol.getLog();
  //  this.log.info(logi);
  //  protocol.loop++;
  //  protocol.increaseAge();
  //  if(protocol.propagationPolicy.push){
  //    this.log.info('active thread...');
  //    protocol.selectItemsToSend(this.id, protocol.selectPeer(), 'active');
  //  }
  //};
  
  Coordinator.prototype.postProfile = function(){
    var xhr = new XMLHttpRequest();
    var protocol = this.options.secure ? 'https://' : 'http://';
    var url = protocol + this.options.host + ':' + this.options.port + '/profile';
    var self = this;
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-type', 'text/plain');
    xhr.onreadystatechange = function(){
      if (xhr.readyState !== 4){ return; }
      if (xhr.status !== 200) { xhr.onerror(); return; }
      self.log.info('profile was posted properly');
    };
    xhr.onerror = function(){
      self.log.error('while posting profile on server');
    };
    var msg = {id: this.id, profile: this.profile};
    xhr.send(JSON.stringify(msg));
  };
  /**
  * @method getFirstView
  * @desc This method gets from a remote PeerServer a set of remote peer identifiers. This 
  * set of identifiers allows to bootstrap the gossip protocols.*/
  Coordinator.prototype.getFirstView = function() {
    var http = new XMLHttpRequest();
    var protocol = this.options.secure ? 'https://' : 'http://';
    var url = protocol + this.options.host + ':' + this.options.port + '/' +
      this.options.key + '/' + this.id + '/view';
    http.open('get', url, true);
    var self = this;
    http.onerror = function(e) {
      self.log.error('Error retrieving the view of IDs');
      self._abort('server-error', 'Could not get the random view');
    };
    http.onreadystatechange = function() {
      if (http.readyState !== 4){ return; }
      if (http.status !== 200) { http.onerror(); return; }
      console.log('First view: ' + http.responseText);
      var data = JSON.parse(http.responseText);
      if(data.view.length !== 0){
        var algoIds = Object.keys(self.workers);
        for(var i = 0; i < algoIds.length; i++){
          console.log('Sending view to worker: ' + algoIds[i]);
          self.workers[ algoIds[i] ].postMessage({header: 'firstView', view: data.view});
        }
      }else{
        console.error('First view request failed');
        //TODO schedule a new request
      }
    };
    http.send(null);
  };
  
  exports.Coordinator = Coordinator;
})(this);
