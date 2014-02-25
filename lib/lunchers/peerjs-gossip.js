(function(exports){

  function GossipPeer(opts){
    if( !(this instanceof GossipPeer) ) return new GossipPeer(opts);
    Peer.call(this, opts);
    this.gossipProtocol = new SamplingService(opts.gossipOpts);
    this.pool = null;
    this.cycle = 0;
    var self = this;

    this.on('randomView', function(){
      self._bootstraps(self.options.firstViewSize);
    });

    this.on('connection', function(c){
      self._handleConnection(c);
    });

    this.on('doActiveThread', function(view){
      self.gossipProtocol._initialize(view);

      self.pool = window.setInterval(function(){
        self.cycle += 1;
        self._activeThread();
        //      util.log( gossipUtil.getGossipLog(self.cycle, self.id, 
        //        self.gossipProtocol._getLog(), '[]' ));
      }, self.options.gossipPeriod);
    });
  }

  util.inherits(GossipPeer, Peer);

  GossipPeer.prototype._handleConnection = function(connection){
    var self = this;
    if( connection.label === 'rps' ){
      connection.on('data', function(data){
        self.gossipProtocol._select(data);
      });

      connection.on('open', function(){
        if( self.gossipProtocol.propagationPolicy['pull'] ){
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

  GossipPeer.prototype._activeThread = function(){
    var dstPeer = this.gossipProtocol._selectPeer();
    var gossipConnection = this.connect(dstPeer, { label: 'rps' });
    var self = this;

    gossipConnection.on('open', function(){
      util.log( gossipUtil.getGossipLog(self.cycle, self.id, 
        self.gossipProtocol._getLog(), '[]' ));
      var payload = {};
      if( self.gossipProtocol.propagationPolicy['push'] )
        payload = self.gossipProtocol._getItemsToSend(self.id);
      gossipConnection.send( payload );
    });

    gossipConnection.on('data', function(data){
      if( self.gossipProtocol.propagationPolicy['pull'] )
        self.gossipProtocol._select(data);
      self.gossipProtocol._increaseAge();
    });

    gossipConnection.on('error', function(err){
      util.error('During emitting of a gossip message');
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
