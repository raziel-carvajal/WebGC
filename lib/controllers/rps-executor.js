(function(exports){
  /**
   * @class RpsExecutor
   * @classdesc This class coordinates the execution of the Random Peer Service (RPS)
   * protocol that it is implemented in the {@link SamplingService} class. Like every
   * executor in the current module, this executor is a sub-class of {@link Peer}. 
   * When an object of this class is created a unique ID will be requested to an 
   * instance of the {@link PeerServer} class in order to performed the exchange of 
   * messages though WebRTC. The request of an identifier is the first event 
   * performed by an object of this class.
   * @augments Peer
   * @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr>
   * */
  function RpsExecutor(opts){
    if( !(this instanceof RpsExecutor) ) return new RpsExecutor(opts);
    /** 
     * This method fires the constructor of {@link Peer}. */
    Peer.call(this, opts);
    this.gossipProtocol = new SamplingService(opts.gossipOpts.rpsSel, 
      opts.gossipOpts.propagationPolicyPush, opts.gossipOpts.propagationPolicyPull,
      opts.gossipOpts.rpsH, opts.gossipOpts.rpsS, opts.gossipOpts.rpsView);
    this.gossipPeriod = opts.gossipOpts.gossipPeriod;
    this.firstViewSize = opts.gossipOpts.firstViewSize;
    this.propagationPolicyPush = opts.gossipOpts.propagationPolicyPush;
    this.propagationPolicyPull = opts.gossipOpts.propagationPolicyPull;
    this.pool = null;
    this.cycle = 0;
    var self = this;
    /** 
     * This event is fired when an ID is assigned by a {@link PeerServer}. When the
     * the constructor of {@link Peer} is called, this event is inmediatly fired*/
    this.on('open', function(id){
      window.setTimeout( function(){self.emit('randomView');}, self.gossipPeriod);
    });
    /**
     * This event asks the {@link PeerServer} a random view of peer IDs in order order
     * to bootstrap the RPS service. The actions of this event are found in the 
     * {@link RpsExecutor._bootstraps} method. */
    this.on('randomView', function(){ self._bootstraps(self.firstViewSize);});
    /**
     * This event is fired when a remote peer contacts a {@link RpsExecutor} object
     * through the {@link DataConnection.send} method. The actions of this event are 
     * found in the {@link RpsExecutor._handleConnection} method. */
    this.on('connection', function(c){ self._handleConnection(c);});
    /**
     * This event performed the active thread of the RPS service. The actions of 
     * this event are found in the {@link RpsExecutor._activeThread} method. */
    this.on('doActiveThread', function(view){
      self.gossipProtocol._initialize(view);
      self.pool = window.setInterval(function(){
        self.cycle += 1;
        self._activeThread();
      }, self.gossipPeriod);
    });
  }
  /** 
   * {@link RpsExecutor} is a subclass of {@link Peer}. */
  util.inherits(RpsExecutor, Peer);
 /**
  * @method _handleConnection
  * @param {DataConnection} connection - A {@link DataConnection} class allows wich allows
  * the exchange of meesages amog peers. */
  RpsExecutor.prototype._handleConnection = function(connection){
    var self = this;
    if( connection.label === 'rps' ){
      /** 
       * This event catches a {@link SamplingService} message */
      connection.on('data', function(data){
        self.gossipProtocol._select(data);
      });
     /** As soon as the incoming connection is ready to send, this method is fired. */
      connection.on('open', function(){
        if( self.propagationPolicyPull ){
          var payload = self.gossipProtocol._getItemsToSend(self.id);
          connection.send( payload );
        }
        self.gossipProtocol._increaseAge();
      });
      /** If an error in the connection occurs, this method is fired. */
      connection.on('error', function(err){
        util.error('During the reception of a cyclon payload');
        util.error(err);
      });
    }
  };
/** 
 * This method performs the passive threads of {@link SamplingService}. 
 * @method _activeThread
 */
  RpsExecutor.prototype._activeThread = function(){
    var dstPeer = this.gossipProtocol._selectPeer();
    util.log( gossipUtil.getGossipLog(this.cycle, this.id, 
      this.gossipProtocol._getLog(), '[]' ));
   /** 
    * The {@link Peer.connect} method creates a {@link DataConnection} between two 
    * peers. This connection exchanges {@link SamplingService} messages. */
    var gossipConnection = this.connect(dstPeer, { label: 'rps' });
    var self = this;
    gossipConnection.on('open', function(){
      var payload = {};
      if( self.propagationPolicyPush )
        payload = self.gossipProtocol._getItemsToSend(self.id);
      gossipConnection.send( payload );
    });
    gossipConnection.on('data', function(data){
      if( self.propagationPolicyPull )
        self.gossipProtocol._select(data);
      self.gossipProtocol._increaseAge();
    });
    gossipConnection.on('error', function(err){
      util.error('During emitting of a gossip message');
      util.error(err);
    });

  };
 /**
  * This method request a list of peer IDs to a {@link PeerServer}.
  * @method _bootstraps
  * @param {integer} size - Size of the requested view. */
  RpsExecutor.prototype._bootstraps = function(size) {
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
      var data = JSON.parse(http.responseText);
      /** 
       * When the list of IDs is received the {@link RpsExecutor} instance
       * bootstraps through the {@link doActiveThread} event. */
      self.emit('doActiveThread', data);
    };
    http.send(null);
  };

  exports.RpsExecutor = RpsExecutor;
})(this);
