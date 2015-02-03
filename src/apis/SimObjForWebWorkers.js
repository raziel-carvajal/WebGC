(function(exports){
  function SimObjForWebWorkers(opts){
    this.log = new Logger(opts.loggingServer, opts.peerId, 'SimObjForWebWorkers');
    this.globalView = {};
    this.worker = new Worker(opts.workerFile);
    if(this.worker === 'undefined'){
      this.log.error('WebWorker initialization was not performed');
      return null;
    }
    SimilarityFunction.call(this, opts.profile);
    //this.worker.onmessage = this.updateGlobalView;
    var self = this;
    this.worker.onmessage = function(event){
      self.log.info('View received from the worker: ' + event.data);
      var newView = JSON.parse(event.data);
      var props = Object.keys(newView);
      for(var i = 0; i < props.length; i++)
        self.globalView[ props[i] ] = newView[ props[i] ];
    };
  }
  util.inherits(SimObjForWebWorkers, SimilarityFunction);
  //SimObjForWebWorkers.prototype.updateGlobalView = function(event){
  //  this.log.info('View received from the worker: ' + event.data);
  //  var newView = JSON.parse(event.data);
  //  var props = Object.keys(newView);
  //  for(var i = 0; i < props.length; i++)
  //    this.globalView[ props[i] ] = newView[ props[i] ];
  //};
  SimObjForWebWorkers.prototype.evaluateInWorker = function(view, profile){
    var payload = JSON.stringify({'view': view, 'profile': profile});
    this.worker.postMessage(payload);
  };
  SimObjForWebWorkers.prototype.getClosestNeighbours = function(n, view){
    this.evaluateInWorker(view, this.profile);
    var keys = Object.keys(view);
    if(n <= 0 || keys.length === 0)
      return {};
    if(keys.length <= n)
      return view;
    var values = [], nulls = [], i;
    for( i = 0; i < keys.length; i++ ){
      if(this.globalView.hasOwnProperty(keys[i]) && typeof this.globalView[ keys[i] ] === 'number' )
        values.push({
          k: keys[i],
          v: this.globalView[ keys[i] ]
        });
      else
        nulls.push( keys[i] );
    }
    values.sort( function(a,b){return a.v - b.v;} );
    var result = {};
    i = 0;
    while(i < values.length && i < n){
      result[ values[i].k ] = view[ values[i].k ];
      i++;
    }
    var key;
    while(i < n){
      key = nulls.pop();
      result[key] = view[key];
      i++;
    }
    this.log.info('View after evaluation: ' + JSON.stringify(result));
    return result;
  };
  
  exports.SimObjForWebWorkers = SimObjForWebWorkers;
})(this);
