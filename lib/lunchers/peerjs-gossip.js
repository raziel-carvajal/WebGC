(function(exports){

function GossipPeer(opts){
  if( !(this instanceof GossipPeer) ) return new GossipPeer(opts);
  Peer.call(this, opts);
  this.cyclon = new Cyclon(opts.cacheSize, opts.gossipLength);
  this.pool = null;
  this.cycle = 0;
  this.connectedPeers = {}; 
  var self = this;

  this.on('randomView', function(){
    self._bootstraps(self.options.firstViewSize);
  });

  this.on('connection', function(c){
    self._handleConnection(c);
  });

  this.on('doActiveThread', function(view){
    self.cyclon._initialize(view);

    self.pool = window.setInterval(function(){
      self._doActiveThread();
      self.cycle += 1;
      util.log(self.cyclon._getLog(self.id, self.cycle));
    }, self.options.gossipPeriod);
  });
}

util.inherits(GossipPeer, Peer);

GossipPeer.prototype._handleConnection = function(connection){
  var self = this;

  connection.on('data', function(data){
    if( data.label === 'cyclon-req' ){
      self.cyclon._selectItemsToKeep(self.id, data.payload);
    }
  });

  connection.on('open', function(){
    var payload = gossipUtil.getRandomSubDict(self.cyclon.gossipLength, self.cyclon.cache);
    var msg = { label: 'cyclon-ans', payload: payload};
    connection.send( msg );
  });
	    
  connection.on('error', function(err){
    util.error('Payload was not received');
    util.error(err);
  });

}

GossipPeer.prototype._doActiveThread = function(){
  var connection = null;
  var peerDst = gossipUtil.getOldestKey(this.cyclon.cache);
  if( peerDst !== null ){
//    if ( peerDst in this.connectedPeers ){
//      connection = this.connectedPeers[peerDst];
//      connection.emit('open');
//    }else{
      connection = this.connect(peerDst);
      var self = this;
      connection.on('open', function(){
        var payload = self.cyclon._selectItemsToSend(self.id, connection.peer);
        var msg = { label: 'cyclon-req', payload: payload };
        connection.send(msg);
      });

      connection.on('data', function(data){
        if( data.label === 'cyclon-ans' ){
          self.cyclon._selectItemsToKeep(self.id, data.payload);
        }
      });

      connection.on('error', function(err){
        util.error('Payload was not sent');
        util.error(err);
      });
//    }
  }
}

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
  }
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
}

exports.GossipPeer = GossipPeer;

})(this);
