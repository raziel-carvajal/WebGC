(function(export){
  function GossipConnection(peer, provider, options){
    if (!(this instanceof GossipConnection)) return new GossipConnection(peer, provider, options);
    EventEmitter.call(this);
    this.options = util.extend({
      serialization: 'binary',
      reliable: false
    }, options);
    // Connection is not open yet.
    this.open = false;
    this.type = 'data';
    this.peer = peer;
    this.provider = provider;
    this.id = this.options.connectionId || DataConnection._idPrefix + util.randomToken();
    this.label = this.options.label || this.id;
    this.metadata = this.options.metadata;
    this.serialization = this.options.serialization;
    this.reliable = this.options.reliable;
  
    // Data channel buffering.
    this._buffer = [];
    this._buffering = false;
    this.bufferSize = 0;
  
    // For storing large data.
    this._chunkedData = {};
  
    if (this.options._payload) {
      this._peerBrowser = this.options._payload.browser;
    }
  
    Negotiator.startConnection(
      this,
      this.options._payload || {
        originator: true
      }
    );

  }
})(this);
