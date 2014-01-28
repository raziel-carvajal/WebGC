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
  this.boot = opts.bootable;
  this.loop = 0;
  this.connectedPeers = {}
  var self = this;

  this.on('randomView', function(){
    self._getRandomView(self.options.firstViewSize);
  });

  this.on('connection', function(c){
    self._handleConnection(c);
  });

  this.on('boot-event', function(){
    if( Object.keys(self.cache).length > 0 ){
      self.pool = window.setInterval(function(){
        self._startShuffling();
        self.loop += 1;
      }, self.options.gossipPeriod);
    } else{
      peer.emit('randomView'); 
    }
  });

  this.on('shuffling', function(view){
    for(var i = 0; i < view.length; i += 1){
      self.cache[view[i]] = 0;
    }
    self.pool = window.setInterval(function(){
      self._startShuffling();
      self.loop += 1;
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
      util.log('Cyclon request received');
      util.log('Payload: ' + Object.keys(objRcv.payload));
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
      util.log('Current cache: ' + Object.keys(self.cache));
      self._updateCache(objRcv.payload);
      util.log('Cache after merge: ' + Object.keys(self.cache));
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
  }
}

GossipPeer.prototype._startShuffling = function(){
  for( key in this.cache ){ this.cache[key] += 1; }

  var peerDst = getKeyOfBigestLabel(this.cache);
  var connection;
  if( !this.connectedPeers[peerDst] ){
    connection = this.connect(peerDst);
    this.connectedPeers[peerDst] = connection;
  }else{
    connection = this.connectedPeers[peerDst];
    connection.close();
    connection = this.connect(peerDst);
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
      util.log('Cyclon answer received');
      util.log('Payload: ' + Object.keys(objRcv.payload));
      util.log('Current cache: ' + Object.keys(self.cache));
      self._updateCache(objRcv.payload);
      util.log('Cache after merge: ' + Object.keys(self.cache));
    }
  });

  connection.on('error', function(err){
    util.error('Payload was not sent');
    util.error(err);
  });
}

// util.log(self._getGossipTrace(peerDst, payload));

GossipPeer.prototype._getGossipTrace = function(dstPeer, payload){
  var cacheTrace = '['; var payloadTrace = '['; var limit;
  var cacheKeys = Object.keys(this.cache);
  var payloadKeys = Object.keys(payload);
  if(dstPeer === 'undefined'){
    dstPeer = '?';
  }
  if(cacheKeys.length == 0){
    cacheTrace += ']';
  }else{
    limit = cacheKeys.length - 1;
    for(var i = 0; i < limit; i += 1){
      cacheTrace += '(' + cacheKeys[i] + ', ' + this.cache[cacheKeys[i]].label + '), ';
    }
    cacheTrace += '(' + cacheKeys[limit] + ', ' + this.cache[cacheKeys[limit]].label + ')]';
  }
  if(payloadKeys.length == 0){
    payloadTrace += ']';
  }else{
    limit = payloadKeys.length - 1;
    for(var i = 0; i < limit; i += 1){
      payloadTrace += '(' + payloadKeys[i] + ', ' + payload[payloadKeys[i]].label + '), ';
    }
    payloadTrace += '(' + payloadKeys[limit] + ', ' + payload[payloadKeys[limit]].label + ')]';
  }
  return '{'+this.loop+ '_' + this.id + '_' + cacheTrace + '_' + dstPeer + '_' + payloadTrace +'}';
}

exports.GossipPeer = GossipPeer;

})(this);
