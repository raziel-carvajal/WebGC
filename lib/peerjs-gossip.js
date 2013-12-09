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
  util.log('New GossipPeer <br>');
  this.cacheSize = opts.cacheSize;
  this.cache = {};
  this.pool = null;
  this.boot = opts.bootable;
  var self = this;

  this.on('randomView', function(){
    self._getRandomView(self.options.firstViewSize);
  });
  this.on('connection', function(c){
    self._handleConnection(c);
  });

  this.on('shuffling', function(view){
    for(var i = 0; i < view.length; i += 1){
      self.cache[view[i]] = { label: 0 };
    }
    self.pool = window.setInterval(function(){
      self._startShuffling();
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
    util.log('Random view of peers :: <br>' + data);
    self.emit('shuffling', data);
  };
  http.send(null);
//  else{
//    util.log('START msg from Server was ignored, because this peer already was bootstrapped');
//  }
}

GossipPeer.prototype._handleConnection = function(connection){
  connection.on('data', function(data){
    util.log('I received the next message <br>');
    util.log('Peer :: ' + connection.peer);
    util.log('Data :: ' + data);
  });
}

GossipPeer.prototype._startShuffling = function(){
  for(key in this.cache){
    this.cache[key].label += 1;
  }
  var tmpCache = this._copyCache();
  var peerDst = this._getIndxWithBiggerValue(tmpCache);
  delete tmpCache[peerDst];
  var keys = Object.keys(tmpCache);
  var randomIds = this._getRandomly( (this.options.l - 1), keys);
  var payload = {};
  payload[this.id] = { label: 0 };
  for(var i = 0; i < randomIds.length; i += 1){
    payload[randomIds[i]] = tmpCache[randomIds[i]];
  }
  util.log('Destination peer :: ' + peerDst);
  var tmp = Object.keys(payload);
  util.log('Array after shuffling... <br>');
  for(var i = 0; i < tmp.length; i += 1){
    util.log('ID :: ' + tmp[i]);
    util.log('value :: ' + payload[tmp[i]].label);
  }
  var self = this;
  (function(dst, payload){
    var connection = self.connect(dst);
    connection.on('open', function(){
      connection.send(JSON.stringify({
        label: 'cyclon',
	payload: payload})
      );
    });
    connection.on('error', function(err){
     util.log('ERROR: ' + err + '<br>');
     util.log('during communication with peer ' + dst);
    });
  })(peerDst, payload);
}

GossipPeer.prototype._getIndxWithBiggerValue = function(dictio){
  var keys = Object.keys(dictio);
  if(keys.length == 0){
    util.log('Empty dictionary');
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
    util.log('The local cache is empty');
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
  if(n <= 0 || src.length === 0){
    util.log('The number of required items is zero OR the source is empty');
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

exports.GossipPeer = GossipPeer;

})(this);
