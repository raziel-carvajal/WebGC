(function(exports){

  function RpsExecutor(opts){
    if( !(this instanceof RpsExecutor) ) return new RpsExecutor(opts);
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

    this.on('open', function(id){
      window.setTimeout( function(){self.emit('randomView');}, self.gossipPeriod * 2);
    });

    this.on('randomView', function(){
      self._bootstraps(self.firstViewSize);
    });

    this.on('connection', function(c){
      self._handleConnection(c);
    });

    this.on('doActiveThread', function(view){
      self.gossipProtocol._initialize(view);
      self.pool = window.setInterval(function(){
        self.cycle += 1;
        self._activeThread();
      }, self.gossipPeriod);
    });
  }

  util.inherits(RpsExecutor, Peer);

  RpsExecutor.prototype._handleConnection = function(connection){
    var self = this;
    if( connection.label === 'rps' ){
      connection.on('data', function(data){
        self.gossipProtocol._select(data);
      });

      connection.on('open', function(){
        if( self.propagationPolicyPull ){
          var payload = self.gossipProtocol._getItemsToSend(self.id);
          connection.send( payload );
        }
        self.gossipProtocol._increaseAge();
      });

      connection.on('error', function(err){
        util.error('During the reception of a cyclon payload');
        util.error(err);
      });
    }
  };

  RpsExecutor.prototype._activeThread = function(){
    var dstPeer = this.gossipProtocol._selectPeer();
    util.log( gossipUtil.getGossipLog(this.cycle, this.id, 
      this.gossipProtocol._getLog(), '[]' ));

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
      self.emit('doActiveThread', data);
    };
    http.send(null);
  };

  exports.RpsExecutor = RpsExecutor;
})(this);
