/**
*@module src/patterns*/
(function(exports){
  function SimFuncFactory(opts){
    this.catalogue = {};
    this.log = new Logger(opts.loggingServer, opts.peerId, this.constructor.name);
    this.logOpts = opts.loggingServer;
    this.peerId = opts.peerId;
    this.withWw = false;
    if(opts.simFunOpts.usingWebWorkers && window.Worker){
      this.log.info('One WebWorker will be used per similarity function');
      this.withWw = true;
    }
  }
  SimFuncFactory.prototype.instantiateFuncs = function(obj, profile){
    try{
      if(obj === 'undefined')
        throw 'Object that describes similarity functions is not defined';
      var props = Object.keys(obj);
      if(props.length === 0)
        throw 'At least one similarity function must be declared';
      var constructor, p, opts;
      for(var i = 0; i < props.length; i++){
        p = props[i];
        this.log.info('Property: ' + p);
        if(this.catalogue.hasOwnProperty(p))
          throw 'Property ' + p + ' was already assinged before';
        constructor = exports[ obj[p] ];
        if(constructor === 'undefined')
          throw 'Obect[' + i + '] is not defined in WebGC';
        opts = {
          loggingServer: this.logOpts,
          peerId: this.peerId,
          'profile': profile
        };
        this.catalogue[p] = new constructor(opts);
      }
    }catch(e){
      this.log.error('During the initialization of similarity functions. ' + e.message + '. ' + e.name);
    }
  };
  exports.SimFuncFactory = SimFuncFactory;
})(this);
