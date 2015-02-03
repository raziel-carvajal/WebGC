/** 
* @module lib/controllers */
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
  function Coordinator(opts){
    this.connectedPeers = {};
    this.first = 0;
    this.profile = opts.gossipAlgos.vicinity1.data;
    this.log = new Logger(opts.loggingServer, opts.peerId, 'Coordinator');
    
    this.simFunFactory = new SimFuncFactory({ 
      loggingServer: opts.loggingServer, peerId: opts.peerId, simFunOpts: opts.similarityFunctions
    });
    this.simFunFactory.instantiateFuncs(this.profile);
    
    this.factory = new GossipFactory({ loggingServer: opts.loggingServer, peerId: opts.peerId });
    var algosNames = Object.keys(opts.gossipAlgos);
    var algo;
    for( var i = 0; i < algosNames.length; i++ ){
      algo = opts.gossipAlgos[ algosNames[i] ];
      this.factory.createProtocol(algo, algosNames[i], this);
    }
    this.factory.setDependencies(opts.gossipAlgos, this.simFunFactory.catalogue);
    this.protocols = this.factory.inventory;
    this.gossipUtil = new GossipUtil({
      loggingServer: opts.loggingServer, peerId: opts.peerId, objName: 'Coordinator'
    });
    this.plotterObj = new Plotter(opts.loggingServer, opts.peerId);
    /** 
     * This method fires the constructor of the [Peer]{@link Peer} object. */
    Peer.call(this, opts.peerId, opts.peerJsOpts);
  }
  
  util.inherits(Coordinator, Peer);
  
  Coordinator.prototype.sendTo = function(receiver, payload, protOps){
    if(protOps.push){
      var connection = this.connect(receiver, {label: protOps.id});
      connection.on('error', function(e){
        this.log.error('During the view exchange with: ' + receiver + ', in protocol: ' + protOps.id);
      });
      connection.on('open', function(){
        connection.send(payload);
      });
    }
  };
  
  Coordinator.prototype.setInternalEvents = function(){
    var self = this;
    /**
    * @event Coordinator#doActiveThread
    * This event performs the active thread of the gossip protocols in the
    * [protocols]{@link Coordinator#protocols} object. This event is linked with [the method]
    * {@link ClusteringExecutor#doActiveThread}. */
    this.on('doActiveThread', function(view){
      var i, protocol, keys = Object.keys(self.protocols);
      for( i = 0; i < keys.length; i++ ){
        protocol = self.protocols[ keys[i] ];
        protocol.initialize(view);
      }
      window.setInterval( function(){
        var keys = Object.keys(self.protocols);
        for( var i = 0; i < keys.length; i++ )
          self.doActiveThread( self.protocols[ keys[i] ] );
      }, 5000 );
    });
  };
  
  Coordinator.prototype.setExternalEvents = function(){
    /** 
    * @event Coordinator#open
    * Once the [PeerServe]{@link PeerServer} gives an [id]{@link id} to the local peer
    * the function in this event is performed. */
    var self = this;
    this.on('open', function(){ 
      window.setTimeout( function(){ self.getFirstView(); }, 3000 );
      window.setInterval( function(){ self.getGraph('rps'); }, 11000);
      window.setInterval( function(){ self.getGraph('clu'); }, 11000);
      window.setInterval( function(){ self.first = 1; }, 21000);
    });
    /**
    * @event Coordinator#connection
    * @description This event is fired when a remote peer contacts the local peer via 
    * [the method]{@link DataConnection#send}. The actions of this event are linked with 
    * [the method]{@link ClusteringExecutor#handleConnection}. */
    this.on('connection', function(c){ 
      self.handleConnection(c); 
    });
  };
  
  /**
  * @method handleConnection
  * @description This method performs the passive thread of each gossip-based protocol in the object 
  * Coordinator.protocols
  * @param {DataConnection} connection - This connection allows the exchange of meesages amog peers. */
  Coordinator.prototype.handleConnection = function(connection){
    var protocol = this.protocols[connection.label];
    var self = this;
    connection.on('data', function(data){
      protocol.selectItemsToKeep(self.id, data);
      if( protocol.propagationPolicy.push )
        protocol.selectItemsToSend(self.id, connection.peer, 'passive');
    });
    connection.on('error', function(err){
      self.log.error('During the reception of a ' + protocol.class + ' message');
    });
  };
  
  /** 
  * @method doActiveThread
  * @description This method performs the active thread of each gossip-based protocol in the 
  * Coordinator.protocols object.*/
  Coordinator.prototype.doActiveThread = function(protocol){
    var logi = protocol.protoId + '_' + protocol.loop + '_' + this.id + '_' + protocol.getLog();
    this.log.info(logi);
    protocol.loop++;
    var dstPeer = protocol.selectPeer();
    protocol.increaseAge();
    var connection = this.connect(dstPeer, { label: protocol.protoId });
    var self = this;
    /** As soon as the connection is ready to send data, this event will be fired. */
    connection.on('open', function(){
      var payload = {};
      if( protocol.propagationPolicy.push )
        payload = protocol.getItemsToSend(self.id, connection.peer, 'active');
      connection.send( payload );
    });
    /** This event is fired when a response of a remote peer is expected. */
    connection.on('data', function(data){
      if( protocol.propagationPolicy.pull )
        protocol.selectItemsToKeep(self.id, data);
    });
    /** This event is fired when there is an error in the connection. */
    connection.on('error', function(err){
      self.log.error('During the emition of a ' + protocol.class + ' message. ' + err);
    });
  };
  
  /**
  * @method getPeers
  * @desc This method gets the view GossipProtocol.view of each gossip protocol in the 
  * Coordinator.protocols object. The view of each protocol is identified in a unique way 
  * by a string.
  * @returns {Object} Object that contains the view of each gossip protocol in the 
  * Coordinator.protocols object. */ 
  Coordinator.prototype.getPeers = function(){
    var result = {}, keys = this.protocols.Object.keys();
    var key, value;
    for( var i = 0; i < keys.length; i++ ){
      key = this.protocols[i].class;
      value = this.protocols[i].view;
      result[ key ] = value;
    }
    return result;
  };
  /**
  * @method getFirstView
  * @desc This method gets from a remote PeerServer a set of remote peer identifiers. This 
  * set of identifiers allows to bootstrap the gossip protocols. */
  Coordinator.prototype.getFirstView = function() {
    var http = new XMLHttpRequest();
    var protocol = this.options.secure ? 'https://' : 'http://';
    var url = protocol + this.options.host + ':' + this.options.port + '/' + this.options.key + 
      '/' + this.id + '/' + this.profile + '/view';
    http.open('get', url, true);
    var self = this;
    http.onerror = function(e) {
      self.log.error('Error retrieving the view of IDs');
      self._abort('server-error', 'Could not get the random view');
    };
    http.onreadystatechange = function() {
      if (http.readyState !== 4) {
        return;
      }
      if (http.status !== 200) {
        http.onerror();
        return;
      }
      /** 
      * @fires Coordinator#doActiveThread */
      var data = JSON.parse(http.responseText);
      if(data.view.length !== 0){
        self.test();
        self.emit('doActiveThread', data.view);
      }else
        window.setTimeout( function(){ self.getFirstView(); }, 5000 );
    };
    http.send(null);
  };
  
  Coordinator.prototype.test = function(){
    this.log.error('It is called...');
  };
  
  Coordinator.prototype.getGraph = function(viewType) {
    var loop = this.plotterObj.loop;
    this.log.info('Getting graph with loop ' + loop);
    var http = new XMLHttpRequest();
    var url = 'http://' + this.options.host + ':' + this.options.port + '/' + this.options.key + 
      '/' + this.id + '/getGraph';
    var self = this;
    http.open('get', url, true);
    http.onerror = function(e) {
      self.log.error('Trying to get graph for loop ' + loop);
    };
    http.onreadystatechange = function() {
      if (http.readyState !== 4) {
        return;
      }
      if (http.status !== 200) {
        http.onerror();
        return;
      }
      self.log.info('Graph ' + http.responseText + ' for loop ' + loop);
      var nodes = JSON.parse(http.responseText);
      var neighbours;
      if(viewType === 'clu')
        neighbours = self.protocols.vicinity1;
      if(viewType === 'rps')
        neighbours = self.protocols.cyclon1;
      console.info('View type: ' + viewType);
      console.info( JSON.stringify(neighbours.view) );
      self.plotterObj.buildGraph(viewType, nodes, neighbours.view);
      self.plotterObj.loop++;
    };
    http.send(null);
  };

  exports.Coordinator = Coordinator;
})(this);
