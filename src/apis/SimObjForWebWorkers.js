(function(exports){
  function SimObjForWebWorkers(opts){
    this.log = new Logger(opts.loggingServer, opts.peerId, 'SimObjForWebWorkers');
    this.worker = new Worker(opts.workerFile);
    if(this.worker === 'undefined'){
      this.log.error('WebWorker initialization was not performed');
      return null;
    }
    SimilarityFunction.call(this, opts);
    //this.worker.onmessage = this.updateGlobalView;
    var self = this;
    this.worker.onmessage = function(event){
      var payload = event.data;
      self.log.info('Obj received from the worker: ' + JSON.stringify(payload));
      self.applyEvaluation(payload);
    };
  }
  
  util.inherits(SimObjForWebWorkers, SimilarityFunction);
  
  SimObjForWebWorkers.prototype.getClosestNeighbours = function(n, view, newItem, receiver, protoId){
    var keys = Object.keys(view), r = {};
    if(newItem !== null)
      r[newItem.k] = newItem.v;
    if(n <= 0 || keys.length === 0){
      this.coordinator.sendTo(receiver, r, protoId);
      return;
    }
    if( keys.length <= n ){
      for(var i = 0; i < keys.length; i++)
        r[ keys[i] ] = view[ keys[i] ];
      this.coordinator.sendTo(receiver, r, protoId);
      return;
    }
    var payload = {
      'n': n,
      'view': view,
      'newItem': newItem,
      'receiver': receiver,
      'protoId': protoId,
      profile: this.profile
    };
    this.worker.postMessage(payload);
  };
  
  SimObjForWebWorkers.prototype.applyEvaluation = function(obj){
    var keys = Object.keys(obj.view);
    var values = [], nulls = [], i;
    for( i = 0; i < keys.length; i++ ){
      if(obj.evaluation.hasOwnProperty(keys[i]) && typeof obj.evaluation[ keys[i] ] === 'number' )
        values.push({
          k: keys[i],
          v: obj.evaluation[ keys[i] ]
        });
      else
        nulls.push( keys[i] );
    }
    values.sort( function(a,b){return a.v - b.v;} );
    var result = {};
    i = 0;
    while(i < values.length && i < n){
      result[ values[i].k ] = obj.view[ values[i].k ];
      i++;
    }
    var key;
    while(i < n){
      key = nulls.pop();
      result[key] = obj.view[key];
      i++;
    }
    if(obj.newItem !== null)
      result[newItem.k] = newItem.v;
    this.coordinator.sendTo(obj.receiver, result, obj.protoId);
  };
  
  exports.SimObjForWebWorkers = SimObjForWebWorkers;
})(this);
