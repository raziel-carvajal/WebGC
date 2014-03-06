(function(exports){
  /**
   * @class ClusteringExecutor
   * @augments Peer
   * @classdesc This class coordinates the execution of the {@link Vicinity} protocol using 
   * the {@link Cyclon} protocol as a Random Peer Service. Like every executor in the 
   * current module, this executor is a sub-class of {@link Peer}. When an object of this 
   * class is created a unique ID will be requested to an instance of the 
   * {@link PeerServer} class in order to performed the exchange of messages though WebRTC. 
   * The request of an identifier is the first event performed by an object of this class.
   * @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr>
   */
  function ClusteringExecutor(opts){
    if( !(this instanceof ClusteringExecutor) ) 
      return new ClusteringExecutor(opts);
    /** 
     * This method fires the constructor of {@link Peer}. */
    Peer.call(this, opts);
    this.cyclon = new Cyclon(opts.gossipOpts.cyclonView,
      opts.gossipOpts.cyclonLength);
    this.vicinity = new Vicinity(opts.gossipOpts.vicinityView,
      opts.gossipOpts.vicinityLength, opts.gossipOpts.vicinitySimilarity,
      this.cyclon.view);
    /** 
     * The periodicity of {@link Cyclon} and {@link Vicinity} is the same. */
    this.gossipPeriod = opts.gossipOpts.gossipPeriod;
    this.firstViewSize = opts.gossipOpts.firstViewSize;
    this.propagationPolicyPush = opts.gossipOpts.propagationPolicyPush;
    this.propagationPolicyPull = opts.gossipOpts.propagationPolicyPull;
    this.vicinitySelection = opts.gossipOpts.vicinitySelection;
    this.pool = null;
    this.cycle = 0;
    var self = this;
    /** 
     * This event is fired when an ID is assigned by a {@link PeerServer}. When the
     * the constructor of {@link Peer} is called, this event is inmediatly fired*/
    this.on('open', function(id){
      window.setTimeout( function(){self.emit('randomView');}, self.gossipPeriod );
    }); 
    /**
     * This event asks the {@link PeerServer} a random view of peer IDs in order order
     * to bootstrap {@link Vicinity} and {@link Cyclon}. The actions of this event are
     * found in the {@link ClusteringExecutor._bootstraps} method. */
    this.on('randomView', function(){ self._bootstraps(self.firstViewSize); });
    /**
     * This event is fired when a remote peer contacts a {@link ClusteringExecutor} object
     * through the {@link DataConnection.send} method. The actions of this event are found 
     * in the {@link ClusteringExecutor._handleConnection} method. */
    this.on('connection', function(c){ self._handleConnection(c);});
    /**
     * This event performed the active thread of {@link Vicinity} and {@link Cyclon}. 
     * The actions of this event are found in the {@link ClusteringExecutor._activeThread} 
     * method. */
    this.on('doActiveThread', function(view){
      self.cyclon._initialize(view);
      self.vicinity._initialize(view);
      self.pool = window.setInterval(function(){
        self.cycle += 1;
        self._activeThread();
      }, self.gossipPeriod);
    });
  }
  /** 
   * {@link ClusteringExecutor} is a subclass of {@link Peer}. */
  util.inherits(ClusteringExecutor, Peer);
  /**
   * @method _handleConnection
   * @param {DataConnection} connection - A {@link DataConnection} class allows wich allows
   * the exchange of meesages amog peers.
   */
  ClusteringExecutor.prototype._handleConnection = function(connection){
    var self = this;
    if( connection.label === 'cyclon' ){
      /**
       * This event catches the payload of a {@link Cyclon} message. */
      connection.on('data', function(data){
        self.cyclon._selectItemsToKeep(self.id, data);
      });
      /** As soon as the incoming connection is ready to send, this method is fired. */
      connection.on('open', function(){
        if( self.propagationPolicyPull ){
          var payload = self.cyclon._getItemsToSend(self.id, 
            connection.peer, 'passive');
          connection.send( payload );
        }
      });
      /** If an error in the connection occurs, this method is fired. */
      connection.on('error', function(err){
        util.error('During the reception of a cyclon payload');
        util.error(err);
      });
    }else if( connection.label === 'vicinity' ){
      /** 
       * This event catches the payload of a {@link Vicinity} message. */
      connection.on('data', function(data){
        self.vicinity._selectItemsToKeep(self.id, data);
      });
      connection.on('open', function(){
        if( self.propagationPolicyPull ){
          var payload = self.vicinity._getItemsToSend(self.id, 
            connection.peer, self.vicinitySelection, 'passive');
          connection.send( payload );
        }
      });
      connection.on('error', function(err){
        util.error('During the reception of a vicinity payload');
        util.error(err);
      });
    }
  };
  /** 
   * This method performs the passive threads of {@link Viciniy} and {@link Cyclon}. 
   * @method _activeThread
   */
  ClusteringExecutor.prototype._activeThread = function(){
    var cyclonDst = this.cyclon._selectPeer();
    this.cyclon._increaseAge();
    var vicinityDst = this.vicinity._selectPeer();
    this.vicinity._increaseAge();
    util.log( gossipUtil.getGossipLog(this.cycle, this.id, 
      this.vicinity._getLog(), this.cyclon._getLog() ));
    /** 
     * The {@link Peer.connect} method creates a {@link DataConnection} between two 
     * peers. This connection exchanges {@link Cyclon} messages. */
    var cyclonCon = this.connect(cyclonDst, { label: 'cyclon' });
    var self = this;
    /** As soon as the connection is ready to send data, this event will be fired. */
    cyclonCon.on('open', function(){
      var payload = {};
      if( self.propagationPolicyPush )
        payload = self.cyclon._getItemsToSend(self.id, cyclonCon.peer, 'active');
      gossipUtil.setData(payload, self.id, self.vicinity.proximityFunc.proxVal);
      cyclonCon.send( payload );
    });
    /** This event is fired if a response of a remote peer is expected. */
    cyclonCon.on('data', function(data){
      if( self.propagationPolicyPull )
        self.cyclon._selectItemsToKeep(self.id, data);
    });
    /** This event is fired if there is an error in the connection. */
    cyclonCon.on('error', function(err){
      util.error('During the emition of a cyclon message');
      util.error(err);
    });
    /** 
     * The {@link Peer.connect} method creates a {@link DataConnection} between two 
     * peers. This connection exchanges {@link Vicinity} messages. */
    var vicinityCon = this.connect(vicinityDst, { label: 'vicinity' });
    vicinityCon.on('open', function(){
      var payload = {};
      if( self.propagationPolicyPush )
        payload = self.vicinity._getItemsToSend(self.id, vicinityCon.peer, 
          self.vicinitySelection, 'active');
      vicinityCon.send( payload );
    });
    vicinityCon.on('data', function(data){
      if( self.propagationPolicyPull )
        self.vicinity._selectItemsToKeep(self.id, data);
    });
    vicinityCon.on('error', function(err){
      util.error('During the emition of a vicinity message');
      util.error(err);
    });
  };
  /**
  * This method gets {@link n} most similar peers of {@link Vicinity}.
  * @method _getSimilarPeers
  * @param {Integer} n - Number of the required peer IDs.
  * @returns {String[]} Array of {@link n} peer IDs.*/ 
  ClusteringExecutor.prototype._getSimilarPeers = function(n){
    return this.vicinity._getPeerIDs(n);
  };
  /**
   * This method request a list of peer IDs to a {@link PeerServer}.
   * @method _bootstraps
   * @param {integer} size - Size of the requested view. */
  ClusteringExecutor.prototype._bootstraps = function(size) {
    if( typeof(size) !== 'number' ){
      util.error('The size of the list is not an integer');
      util.error('The request was not sent to PeerServer');
      return null;
    }
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
      var data = JSON.parse(http.responseText);
      self.emit('doActiveThread', data);
    };
    http.send(null);
  };

  exports.ClusteringExecutor = ClusteringExecutor;
})(this);
