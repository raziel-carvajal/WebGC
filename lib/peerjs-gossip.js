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
//        util.log('Gossip loop: ' + self.loop);
        self._startShuffling();
        self.loop += 1;
      }, self.options.gossipPeriod);
    } else{
//      util.log('Requesting first view...');
      peer.emit('randomView'); 
    }
  });

  this.on('shuffling', function(view){
    for(var i = 0; i < view.length; i += 1){
      self.cache[view[i]] = { label: 0 };
    }
    self.pool = window.setInterval(function(){
//      util.log('Gossip loop: ' + self.loop);
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
  var self = this;
  var http = new XMLHttpRequest();
  var protocol = this.options.secure ? 'https://' : 'http://';
  var url = protocol + this.options.host + ':' + this.options.port + '/' + this.options.key + '/' + this.id + '/view';
  http.open('get', url, true);
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
//    util.log('First view: ' + data.toString());
    self.emit('shuffling', data);
  };
  http.send(null);
}

GossipPeer.prototype._handleConnection = function(connection){
  var self = this;
//  util.log('Gossip msg received');
//  util.log('I am  peer: ' + self.id);
//  util.log('Current cache:' + JSON.stringify(self.cache));
  connection.on('data', function(data){
    if(data != 'undefined'){
      var objRcv = JSON.parse(data);
//      util.log('Type of the received message: ' + objRcv.label);
      var tmpKeys = Object.keys(objRcv.payload);
      if( Object.keys(self.cache) === 0 ){
//        util.log('Case: actual cache empty and payload non empty');
	for(var i = 0; i < tmpKeys.length; i += 1){
	  self.cache[tmpKeys[i]] = objRcv.payload[tmpKeys[i]];
	}
      } else{
//        util.log('Case: actual cache and payload are not empty');
        var currentKeys = Object.keys(self.cache);
        var emitterKeys = [];
        if( tmpKeys.length > self.options.l ){
          for(var i = 0; i < self.options.l; i += 1){
            emitterKeys.push(tmpKeys[i]);
          }
        } else{
          emitterKeys = tmpKeys; 
        }
//        util.log('Received keys for merging: ' + emitterKeys.toString());
        // Response of a shuffling-request message
        if( objRcv.msg === 'shuffling-request' ){
          var randomIds = self._getRandomly(self.options.l, currentKeys);
          var tmpDict = {};
          for(var i = 0; i < randomIds.length; i += 1){
            tmpDict[randomIds[i]] = self.cache[randomIds[i]];
          }
//          util.log('Answering of a shugffling request to: ' + connection.peer);
//          util.log('Payload: ' + JSON.stringify(tmpDict));
          connection.send(JSON.stringify({
            label: 'cyclon',
            msg: 'shuffling-response',
            payload: tmpDict})
          );
        }
        // Merging caches
        currentKeys.push(self.id);
        for(var i = 0; i < emitterKeys.length; i += 1){
          if( Object.keys(self.cache).length < self.options.cacheSize ){
            if( !isInArray(emitterKeys[i], currentKeys) ){
              self.cache[emitterKeys[i]] = objRcv.payload[emitterKeys[i]];
            }
          } else{
            break;
          }
        }
      }
    } else{
      util.warn('Empty payload received');
    }
//    util.log('Cache after merging: ' + JSON.stringify(self.cache));
  });
}

GossipPeer.prototype._startShuffling = function(){
  for(key in this.cache){
    this.cache[key].label += 1;
  }
  var tmpCache = this._copyCache();
  var peerDst = this._getIndxWithBiggerValue(tmpCache);
//  util.log('Destination peer: ' + peerDst);
  delete tmpCache[peerDst];
  var keys = Object.keys(tmpCache);
  var randomIds = this._getRandomly( (this.options.l - 1), keys);
  var payload = {};
  payload[this.id] = { label: 0 };
  for(var i = 0; i < randomIds.length; i += 1){
    payload[randomIds[i]] = tmpCache[randomIds[i]];
  }
  var self = this;
//  util.log('Payload: ' + JSON.stringify(payload));
  (function(dst, payload){
    var connection = self.connect(dst);
    connection.on('open', function(){
      connection.send(JSON.stringify({
        label: 'cyclon',
	msg: 'shuffing-request',
	payload: payload})
      );
    });
    // ** Log trace is captured here
    var trace = self._getGossipTrace(peerDst, payload);
    util.log(trace);
    connection.on('error', function(err){
     util.error(err);
     util.error('Payload was not sent');
    });
  })(peerDst, payload);
}

GossipPeer.prototype._getIndxWithBiggerValue = function(dictio){
  var keys = Object.keys(dictio);
  if(keys.length == 0){
    util.warn('Empty dictionary');
    return null;
  }
  var maxValue = dictio[keys[0]].label;
  var maxIndx = keys[0];
  for(var i = 1; i < keys.length; i += 1){
    if( dictio[keys[i]].label > maxValue ){
      maxValue = dictio[keys[i]].label;
      maxIndx = keys[i];
    }
  }
  return maxIndx;
}

GossipPeer.prototype._copyCache = function(){
  var keys = Object.keys(this.cache);
  if(keys.length == 0){
    util.warn('The local cache is empty');
    return {};
  }
  var result = {}, key, value;
  for(var i = 0; i < keys.length; i += 1){
    key = keys[i];
    value = this.cache[key];
    result[key] = value;
  }
  return result;
}

GossipPeer.prototype._getRandomly = function(n, src){
  if(n <= 0 || src === 'undefined'){
    util.warn('The number of required items is zero OR the source is empty');
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
  var r='{'+ this.loop + '_' + this.id + '_' + cacheTrace + '_' + dstPeer + '_' + payloadTrace +'}';
  return r;
}

exports.GossipPeer = GossipPeer;

})(this);
