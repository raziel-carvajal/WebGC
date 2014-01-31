(function(exports){

function isInArray(x, array){
  if( array.length === 0 )
    return false;
  for(var i = 0; i < array.length; i += 1){
    if( array[i] === x )
      return true;
  }
  return false;
}

function getKeyOfBigestLabel(dictio){
  var keys = Object.keys(dictio);
  if( keys.length == 0 ){
    util.warn('Empty dictionary');
    return 'undefined';
  }
  var maxValue = dictio[keys[0]];
  var maxIndx = keys[0];
  var i = 1;
  do{
    if( dictio[keys[i]] > maxValue ){
      maxValue = dictio[keys[i]];
      maxIndx = keys[i];
    }
    i += 1;
  }while( i < keys.length );
  return maxIndx;
}

function getCopy(dict){
  var keys = Object.keys(dict);
  if( keys.length == 0 ){
    return {};
  }
  var result = {}, key, value;
  for(var i = 0; i < keys.length; i += 1){
    key = keys[i];
    value = dict[key];
    result[key] = value;
  }
  return result;
}

function getRandomly(n, src){
  if( n <= 0 || src.length === 0 ){
    return [];
  }
  var result = [], tmp = [];
  if( n >= src.length ){
    return src;
  } else {
    do{
      rNum = Math.floor(Math.random() * src.length);
      if( !isInArray(rNum, tmp) ){
        tmp.push(rNum);
        result.push(src[rNum]);
      }
    } while( result.length != n );
  }
  return result;
}


/*
 * Gossip Peer for Brow2Brow
 */

function GossipPeer(opts){
  if( !(this instanceof GossipPeer) ) return new GossipPeer(opts);
  Peer.call(this, opts);
  this.cache = {};
  this.pool = null;
  this.loop = 0;
  this.connectedPeers = {}
  var self = this;

  this.on('randomView', function(){
    self._getRandomView(self.options.firstViewSize);
  });

  this.on('connection', function(c){
    self._handleConnection(c);
  });

  this.on('shuffling', function(view){
    for(var i = 0; i < view.length; i += 1){
      self.cache[view[i]] = 0;
    }
    self.pool = window.setInterval(function(){
      self._startShuffling();
      self.loop += 1;
      util.log(self._getGossipTrace());
    }, self.options.gossipPeriod);
  });
}

util.inherits(GossipPeer, Peer);

GossipPeer.prototype._getRandomView = function(size) {
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
    self.emit('shuffling', data);
  };
  http.send(null);
}

GossipPeer.prototype._handleConnection = function(connection){
  var self = this;
  connection.on('data', function(data){
    var objRcv = JSON.parse(data);
    if( objRcv.label === 'cyclon-req' ){
      var currentKeys = Object.keys(self.cache);
      var randomIds = getRandomly(self.options.l, currentKeys);
      var payload = {};
      for(var i = 0; i < randomIds.length; i += 1){
        payload[randomIds[i]] = self.cache[randomIds[i]];
      }
      connection.send(JSON.stringify({
        label: 'cyclon-ans',
        payload: payload })
      );
      self._updateCache(objRcv.payload);
    }
  });
}

GossipPeer.prototype._updateCache = function(rcvCache){
  var rcvKeys = Object.keys(rcvCache);
  if( rcvKeys.length === 0 ){
    return;
  }
  var i;
  var currentKeys = Object.keys(this.cache);
  if( currentKeys.length === 0 ){
    i = 0;
    do{
      this.cache[rcvKeys[i]] = rcvCache[rcvKeys[i]];
      i += 1;
    }while( i < rcvKeys.length && Object.keys(this.cache).length <= this.options.cacheSize );
  }else{
    var newCache = {};
    if( this.id in rcvCache ){
      delete rcvCache[this.id];
    }
    for( i = 0; i < rcvKeys.length; i += 1 ){
      if( isInArray(rcvKeys[i], currentKeys) ){
        delete rcvCache[rcvKeys[i]];
      }else{
        newCache[rcvKeys[i]] = rcvCache[rcvKeys[i]];
      }
    }
    i = 0;
    while( Object.keys(newCache).length <= this.options.cacheSize && i < currentKeys.length ){
      newCache[currentKeys[i]] = this.cache[currentKeys[i]];
      i += 1;
    }
    this.cache = newCache;
  }
}

GossipPeer.prototype._startShuffling = function(){
  for( key in this.cache ){ this.cache[key] += 1; }

  var peerDst = getKeyOfBigestLabel(this.cache);
  var connection;
  if( peerDst in this.connectedPeers ){
    connection = this.connectedPeers[peerDst];
    connection.close();
    connection = this.connect(peerDst);
  }else{
    connection = this.connect(peerDst);
    this.connectedPeers[peerDst] = connection;
  }

  var self = this;
  connection.on('open', function(){
    var tmpCache = getCopy(self.cache);
    var dst = connection.peer;
    delete tmpCache[dst];
    var keys = Object.keys(tmpCache);
    var randomIds = getRandomly(self.options.l - 1, keys);
    var payload = {};
    payload[self.id] = 0;
    for(var i = 0; i < randomIds.length; i += 1){
      payload[randomIds[i]] = tmpCache[randomIds[i]];
    }
    connection.send(JSON.stringify({
      label: 'cyclon-req',
      payload: payload })
    );
  });

  connection.on('data', function(data){
    var objRcv = JSON.parse(data);
    if( objRcv.label === 'cyclon-ans' ){
      self._updateCache(objRcv.payload);
    }
  });

  connection.on('error', function(err){
    util.error('Payload was not sent');
    util.error(err);
  });
}

GossipPeer.prototype._getGossipTrace = function(){
  var cacheTrace = '['; var limit;
  var cacheKeys = Object.keys(this.cache);
  if(cacheKeys.length == 0){
    cacheTrace += ']';
  }else{
    limit = cacheKeys.length - 1;
    for(var i = 0; i < limit; i += 1){
      cacheTrace += '(' + cacheKeys[i] + ', ' + this.cache[cacheKeys[i]] + '), ';
    }
    cacheTrace += '(' + cacheKeys[limit] + ', ' + this.cache[cacheKeys[limit]] + ')]';
  }
  return '{'+this.loop+ '_' + this.id + '_' + cacheTrace +'}';
}

exports.GossipPeer = GossipPeer;

})(this);
