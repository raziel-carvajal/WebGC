/**
*@module src/patterns*/
(function(exports){
  function SimFuncFactory(opts){
    this.inventory = {};
    this.log = new Logger(opts.loggingServer, opts.peerId, this.constructor.name);
    this.logOpts = opts.loggingServer;
    this.peerId = opts.peerId;
  }
  SimFuncFactory.prototype.getInstances = function(obj, profile){
    var result;
    try{
      if(obj === 'undefined')
        throw 'Object that describes similarity functions is not defined';
      var props = Object.keys(obj);
      if(props.length === 0)
        throw 'At least one similarity function must be declared';
      var constructor, p, opts;
      result = {};
      for(var i = 0; i < props.length; i++){
        p = props[i];
        if(this.inventory.hasOwnProperty(p))
          throw 'Property ' + p + ' was already assinged before';
        constructor = exports[ obj[p] ];
        if(constructor === 'undefined')
          throw 'Obect[' + i + '] is not defined in WebGC';
        opts = {
          loggingServer: this.logOpts,
          peerId: this.peerId
        };
        result[p] = new constructor(opts);
      }
    }catch(e){
      this.log.error('During the initialization of similarity functions. ' + e.message);
    }
    return result;
  };
  exports.SimFuncFactory = SimFuncFactory;
})(this);
