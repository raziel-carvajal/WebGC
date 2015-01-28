/**
*@module src/patterns*/
(function(exports){
  function SimFuncFactory(opts){
    this.catalogue = {};
    this.log = new Logger(opts.loggingServer, opts.peerId, 'SimFuncFactory');
    this.logOpts = opts.loggingServer;
    this.peerId = opts.peerId;
    this.funcs = opts.simFunOpts.functions;
    this.withWw = false;
    if(opts.simFunOpts.usingWebWorkers && window.Worker){
      this.log.info('One WebWorker will be used per similarity function');
      this.withWw = true;
    }else{
      this.log.error('Functionality with WebWorkers is not used. Instead, the similarity function '+
        'by default in WebGC  will be initializated');
    }
  }
  SimFuncFactory.prototype.instantiateFuncs = function(profile){
    try{
      if(this.funcs === 'undefined')
        throw 'Object that describes similarity functions is not defined';
      var props = Object.keys(this.funcs);
      if(props.length === 0)
        throw 'At least one similarity function must be declared';
      var constructor, p, opts;
      for(var i = 0; i < props.length; i++){
        p = props[i];
        this.log.info('Property: ' + p);
        if(this.catalogue.hasOwnProperty(p))
          throw 'Property ' + p + ' was already assinged before';
        if(this.withWw)
          constructor = exports.SimObjForWebWorkers;//WebGC wrapper for WebWorkers
        else
          constructor = exports[ this.funcs[p] ];
        if(constructor === 'undefined')
          throw 'Obect[' + i + '] is not defined in WebGC';
        opts = {
          loggingServer: this.logOpts,
          peerId: this.peerId,
          'profile': profile,
          workerFile: this.funcs[p]
        };
        this.catalogue[p] = new constructor(opts);
      }
    }catch(e){
      this.log.error('During the initialization of similarity functions. ' + e.message + '. ' + e.name);
    }
  };
  exports.SimFuncFactory = SimFuncFactory;
})(this);
