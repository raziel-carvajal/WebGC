(function(exports){

  function GossipPeer(opts){
    if( !(this instanceof GossipPeer) ) 
      return new GossipPeer(opts);
    Peer.call(this, opts);
    this.cyclon = new Cyclon(opts.gossipOpts.cyclonView,
      opts.gossipOpts.cyclonLength);
    this.vicinity = new Vicinity(opts.gossipOpts.vicinityView,
      opts.gossipOpts.vicinityLength, opts.gossipOpts.vicinitySimilarity,
      this.cyclon.view);
    this.gossipPeriod = opts.gossipOpts.gossipPeriod;
    this.firstViewSize = opts.gossipOpts.firstViewSize;
    this.propagationPolicyPush = opts.gossipOpts.propagationPolicyPush;
    this.propagationPolicyPull = opts.gossipOpts.propagationPolicyPull;
    this.vicinitySelection = opts.gossipOpts.vicinitySelection;
    this.pool = null;
    this.cycle = 0;
    var self = this;

    this.on('open', function(id){
      window.setTimeout( function(){peer.emit('randomView');}, self.gossipPeriod * 2);
    });

    this.on('randomView', function(){
      self._bootstraps(self.firstViewSize);
    });

    this.on('connection', function(c){
      self._handleConnection(c);
    });

    this.on('doActiveThread', function(view){
      self.cyclon._initialize(view);
      self.vicinity._initialize(view);
      self.pool = window.setInterval(function(){
        self.cycle += 1;
        self._activeThread();
      }, self.gossipPeriod);
    });
  }

  util.inherits(GossipPeer, Peer);

  GossipPeer.prototype._handleConnection = function(connection){
    var self = this;
    if( connection.label === 'cyclon' ){

      connection.on('data', function(data){
        self.cyclon._selectItemsToKeep(self.id, data);
      });

      connection.on('open', function(){
        if( self.propagationPolicyPush ){
          var payload = self.cyclon._getItemsToSend(self.id, 
            connection.peer, 'passive');
          connection.send( payload );
        }
      });

      connection.on('error', function(err){
        util.error('During the reception of a cyclon payload');
        util.error(err);
      });
    }else if( connection.label === 'vicinity' ){

      connection.on('data', function(data){
        self.vicinity._selectItemsToKeep(self.id, data);
      });

      connection.on('open', function(){
        if( self.propagationPolicyPush ){
          var payload = self.vicinity._getItemsToSend(self.id, 
            connection.peer, self.vicinitySelection);
          connection.send( payload );
        }
      });

      connection.on('error', function(err){
        util.error('During the reception of a vicinity payload');
        util.error(err);
      });
    }
  };

  GossipPeer.prototype._activeThread = function(){
    var cyclonDst = this.cyclon._selectPeer();
    this.cyclon._increaseAge();
    var vicinityDst = this.vicinity._selectPeer();
    this.vicinity._increaseAge();
    util.log( gossipUtil.getGossipLog(this.cycle, this.id, 
      this.vicinity._getLog(), this.cyclon._getLog() ));

    var cyclonCon = this.connect(cyclonDst, { label: 'cyclon' });
    var self = this;
    cyclonCon.on('open', function(){
     var payload = {};
     if( self.propagationPolicyPush )
       payload = self.cyclon._getItemsToSend(self.id, cyclonCon.peer, 'active');
     cyclonCon.send( payload );
    });
    cyclonCon.on('data', function(data){
      if( self.propagationPolicyPull )
        self.cyclon._selectItemsToKeep(self.id, data);
    });
    cyclonCon.on('error', function(err){
      util.error('During the emition of a cyclon message');
      util.error(err);
    });

    var vicinityCon = this.connect(vicinityDst, { label: 'vicinity' });
    vicinityCon.on('open', function(){
      var payload = {};
      if( self.propagationPolicyPush )
        payload = self.vicinity._getItemsToSend(self.id, vicinityCon.peer, 
          self.vicinitySelection);
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

  GossipPeer.prototype._bootstraps = function(size) {
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

  exports.GossipPeer = GossipPeer;
})(this);
