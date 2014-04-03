(function(exports){
  /**
  * @class Coordinator
  * @augments Peer
  * @classdesc This class coordinates the execution of the {@link Vicinity} protocol using 
  * the {@link Cyclon} protocol as a Random Peer Service. Like every executor in the 
  * current module, this executor is a sub-class of {@link Peer}. When an object of this 
  * class is created a unique ID will be requested to an instance of the 
  * {@link PeerServer} class in order to performed the exchange of messages though WebRTC. 
  * The request of an identifier is the first event performed by an object of this class.
  * @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr>
  */
  function Coordinator(opts){
    if( !(this instanceof Coordinator) ) 
      return new Coordinator(opts);
    var gossipConfig;
    this.factory = new GossipFactory();
    for( var i = 0, ii = opts.protocols.length; i < ii; i++ ){
      gossipConfig = opts.protocols[i];
      this.factory.createProtocol(gossipConfig);
    }
    this.factory.setDependencies();
    this.protocols = this.factory.inventory;
    /** 
     * This method fires the constructor of {@link Peer}. */
    Peer.call(this, opts.peerServer);
    var self = this;
    /** 
     * This event is fired when an ID is assigned by a {@link PeerServer}. When the
     * the constructor of {@link Peer} is called, this event is inmediatly fired*/
    this.on('open', function(id){ 
      window.setTimeout( function(){ self.getFirstView(); }, 10000 );
    });
    /**
     * This event is fired when a remote peer contacts a {@link ClusteringExecutor} object
     * through the {@link DataConnection.send} method. The actions of this event are found 
     * in the {@link ClusteringExecutor.handleConnection} method. */
    this.on('connection', function(c){ self.handleConnection(c); });
    /**
     * This event performed the active thread of {@link Vicinity} and {@link Cyclon}. 
     * The actions of this event are found in the {@link ClusteringExecutor.doActiveThread} 
     * method. */
    this.on('doActiveThread', function(view){
      var i, protocol, keys = Object.keys(self.protocols);
      console.log('Enter to do active...');
      for( i = 0; i < keys.length; i++ ){
        protocol = self.protocols[ keys[i] ];
        protocol.initialize(view);
      }
      window.setInterval( function(){
        var keys = Object.keys(self.protocols);
        for( var i = 0; i < keys.length; i++ )
          self.doActiveThread( self.protocols[ keys[i] ] );
      }, 1000 );
    });
  }
  /** 
   * {@link ClusteringExecutor} is a subclass of {@link Peer}. */
  util.inherits(Coordinator, Peer);
  /**
   * @method handleConnection
   * @param {DataConnection} connection - A {@link DataConnection} class allows wich allows
   * the exchange of meesages amog peers.
   */
  Coordinator.prototype.handleConnection = function(connection){
    var protocol = this.protocols[connection.label];
    var self = this;
    /**
    * This event catches the payload of a {@link Cyclon} message. */
    connection.on('data', function(data){
      protocol.selectItemsToKeep(self.id, data);
    });
    /** As soon as the incoming connection is ready to send, this method is fired. */
    connection.on('open', function(){
      if( protocol.propagationPolicy.pull ){
        var payload = protocol.getItemsToSend(self.id, connection.peer, 'passive');
        connection.send(payload);
      }
    });
    /** If an error in the connection occurs, this method is fired. */
    connection.on('error', function(err){
      util.error('During the reception of a ' + protocol.name + ' message');
      util.error(err);
    });
  };
  /** 
  * This method performs the passive threads of {@link Viciniy} and {@link Cyclon}. 
  * @method doActiveThread 
  */
  Coordinator.prototype.doActiveThread = function(protocol){
    var log = protocol.iD + '_' + protocol.loop + '_' + this.id + '_' + protocol.getLog();
    console.log( '{' + log + '}' );
    protocol.loop++;
    var dstPeer = protocol.selectPeer();
    protocol.increaseAge();
    /** 
    * The {@link Peer.connect} method creates a {@link DataConnection} between two 
    * peers. This connection exchanges {@link Cyclon} messages. */
    var connection = this.connect(dstPeer, { label: protocol.iD });
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
      util.error('During the emition of a ' + protocol.object + ' message');
      util.error(err);
    });
  };
  /**
  * This method gets {@link n} most similar peers of {@link Vicinity}.
  * @method getPeers
  * @param {Integer} n - Number of the required peer IDs.
  * @returns {String[]} Array of {@link n} peer IDs.*/ 
  Coordinator.prototype.getPeers = function(){
    var result = {}, keys = this.protocols.Object.keys();
    var key, value;
    for( var i = 0; i < keys.length; i++ ){
      key = this.protocols[i].iD;
      value = this.protocols[i].view;
      result[ key ] = value;
    }
    return result;
  };
  /**
   * This method request a list of peer IDs to a {@link PeerServer}.
   * @method getFirstView
   * @param {integer} size - Size of the requested view. */
  Coordinator.prototype.getFirstView = function() {
    var http = new XMLHttpRequest();
    var protocol = this.options.secure ? 'https://' : 'http://';
    var url = protocol + this.options.host + ':' + this.options.port + '/' + this.options.key + '/' + this.id + '/view';
    http.open('get', url, true);
    var self = this;
    http.onerror = function(e) {
      util.error('Error retrieving the view of IDs', e);
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
       * When the list of IDs is received the {@link ClusteringExecutor} instance
       * bootstraps through the {@link doActiveThread} event. */
      console.log('Data :: ' + http.responseText);
      var data = JSON.parse(http.responseText);
      self.emit('doActiveThread', data);
    };
    http.send(null);
  };

  exports.Coordinator = Coordinator;
})(this);
