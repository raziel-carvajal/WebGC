(function(exports){
  function Provider(log, path, emitter, target, opts, getConFun){
    if(!(this instanceof Provider))
      return  new Provider(log, path, emitter, target, opts, getConFun);
    this.log = log;
    this.path = path;
    this.emitter = emitter;
    this.target = target;
    this.opts = opts;
    this.getConnection = getConFun;
    //called like that for being compatible with PeerJS
    this.socket = { send: this.send };
  }
  Provider.prototype.send = function(msg){
    msg.header = 'LOOKUP';
    msg.path = this.path;
    msg.step = 0;
    msg.target = target;
    this.log.info('Provider sending msg: ' + JSON.stringify(msg));
    this.connection.send(msg);
  };
  Provider.prototype.emit = function(event, obj){
    if(event === 'error')
    this.log.error('Obj: ' + JSON.stringify(obj));
    else
      this.log.warn('Obj: ' + JSON.stringify(obj));
  };
  exports.Provider = Provider;
})(this);
