(function(exports){

function GossipPeer(opts){
  if( !(this instanceof GossipPeer) ) return new GossipPeer(opts);
  Peer.call(this, opts);
  this.cyclon = new Cyclon(opts.cacheSize, opts.gossipLength);
  this.vicinity = new Vicinity(opts.cacheSize, opts.gossipLength);
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
    self.cyclon._initialize(view);
    self.vicinity._initialize(self.cyclon.cache);

    self.pool = window.setInterval(function(){
      self._doActiveThread();
      self.cycle += 1;
      util.log( gossipUtil.getGossipLog(self.cycle, self.id, 
        self.cyclon._getLog(), self.vicinity._getLog() ));
    }, self.options.gossipPeriod);
  });
}

util.inherits(GossipPeer, Peer);

GossipPeer.prototype._handleConnection = function(connection){
  var self = this;

  if( connection.label === 'cyclon' ){

    connection.on('data', function(data){
      self.cyclon._selectItemsToKeep(self.id, data.payload);
    });
  
    connection.on('open', function(){
      var payload = gossipUtil.getRandomSubDict(self.cyclon.gossipLength, self.cyclon.cache);
      connection.send( payload );
    });
  	    
    connection.on('error', function(err){
      util.error('During the reception of a cyclon payload');
      util.error(err);
    });
  } else if( connection.label === 'vicinity' ){

    connection.on('data', function(data){
      self.cyclon._selectItemsToKeep(self.id, data.payload);
    });
  
    connection.on('open', function(){
      var payload = gossipUtil.getRandomSubDict(self.cyclon.gossipLength, self.cyclon.cache);
      connection.send( payload );
    });
  	    
    connection.on('error', function(err){
      util.error('During the reception of a vicinity payload');
      util.error(err);
    });

  }
}

GossipPeer.prototype._doActiveThread = function(){
  var dstCyclon = gossipUtil.getOldestKey(this.cyclon.cache);
  var dstVicinity = gossipUtil.getOldestKey(this.vicinity.cache);
  var self = this;

  if( dstCyclon !== null ){
    var conCyclon = this.connect(dstCyclon, {label: 'cyclon'});

    conCyclon.on('open', function(){
      var payload = self.cyclon._selectItemsToSend(self.id, conCyclon.peer);
      conCyclon.send( payload );
    });

    conCyclon.on('data', function(data){
      self.cyclon._selectItemsToKeep(self.id, data);
    });

    conCyclon.on('error', function(err){
      util.error('At Cyclon connection: payload was not sent');
      util.error(err);
    });
  }
  
  if( dstVicinity !== null ){
    var conVicinity = this.connect(dstVicinity, {label: 'vicinity'});
   
    conVicinity.on('open', function(){

    });

    conVicinity.on('data', function(data){
    
    });
  
    conVicinity.on('error', function(err){
      util.error('At Vicinity connection: payload was not sent');
      util.error(err);
    });

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
