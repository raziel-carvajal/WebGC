(function(exports){
  function SimObjForWebWorkers(opts){
    this.log = new Logger(opts.loggingServer, opts.peerId, 'SimObjForWebWorkers');
    this.worker = new Worker(opts.workerFile);
    if(this.worker === 'undefined'){
      this.log.error('WebWorker initialization was not performed');
      return null;
    }
    SimilarityFunction.call(this, opts);
    var self = this;
    this.worker.onmessage = function(event){
      var payload = event.data;
      self.log.info('Obj received from the worker: ' + JSON.stringify(payload));
      self.applyEvaluation(payload);
    };
  }
  
  util.inherits(SimObjForWebWorkers, SimilarityFunction);
  
  SimObjForWebWorkers.prototype.getClosestNeighbours = function(n, view, newItem, receiver, protoId){
    var keys = Object.keys(view);
    if( !this.checkBaseCase(n, view, newItem, receiver, protoId, keys, false) ){
      var payload = {
        'n': n,
        'view': view,
        'newItem': newItem,
        'receiver': receiver,
        'protoId': protoId,
        profile: this.profile,
        updateCluView: false
      };
      this.worker.postMessage(payload);
    }
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
    var result = this.orderBySimilarity(values, obj.n, obj.view, nulls);
    if(obj.newItem !== null)
      result[newItem.k] = newItem.v;
    if(obj.updateCluView){
      keys = Object.keys(result);
      //clustring protocol view will be updated here!!!
      this.cluView = {};
      for(i = 0; i < keys.length; i++)
        this.cluView[ keys[i] ] = result[ keys[i] ];
    }else
      this.coordinator.sendTo(obj.receiver, result, obj.protoId);
  };
  
  SimObjForWebWorkers.prototype.updateClusteringView = function(n, view){
    var keys = Object.keys(view);
    var result = this.checkBaseCase(n, view, null, null, null, keys, true);
    if(result === null){
      var payload = {
        'n': n,
        'view': view,
        'newItem': null,
        'receiver': null,
        'protoId': null,
        profile: this.profile,
        updateCluView: true
      };
      this.worker.postMessage(payload);
    }else{
      keys = Object.keys(result);
      //clustring protocol view will be updated here!!!
      this.cluView = {};
      for(var i = 0; i < keys.length; i++)
        this.cluView[ keys[i] ] = result[ keys[i] ];
    }
  };
  
  exports.SimObjForWebWorkers = SimObjForWebWorkers;
})(this);
