(function(exports){
  function Provider(opts, connection, path, logger, target){
    if(!(this instanceof Provider)){ return  new Provider(opts, connection, path, logger, target); }
    this.options = opts;
    this.connection = connection;
    //called like that for being compatible with PeerJS
    this.socket = { send: this.send };
    this.path = path;
    this.logger = logger;
    this.target = target;
  }
  Provider.prototype.send = function(msg){
    msg.path = this.path;
    msg.header = 'FWD';
    msg.step = 0;
    msg.target = target;
    this.logger.info('Provider sending msg: ' + JSON.stringify(msg));
    this.connection.send(msg);
  };
  Provider.prototype.emit = function(event, obj){
    if(event === 'error')
    this.logger.error('Obj: ' + JSON.stringify(obj));
    else
      this.logger.warn('Obj: ' + JSON.stringify(obj));
  };
  exports.Provider = Provider;
})(this);
