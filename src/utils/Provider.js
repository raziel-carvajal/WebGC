(function(exports){
  function Provider(target, loUpService){
    if(!(this instanceof Provider))
      return  new Provider(target, loUpService);
    this.log = loUpService.log;
    this.emitter = loUpService.id;
    this.target = target;
    this.opts = loUpService.opts;
    this.loUpService = loUpService;
    this.wasIceCandidateSent = false;
      }
  
  
  Provider.prototype.emit = function(event, obj){
    if(event === 'error')
    this.log.error('Obj: ' + JSON.stringify(obj));
    else
      this.log.warn('Obj: ' + JSON.stringify(obj));
  };
  
  Provider.prototype.getConnection = function(peerId, connectionId){};
  exports.Provider = Provider;
  
})(this);
