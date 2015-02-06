(function(exports){
  function SimObjForWebWorkers(opts){
    this.worker = new Worker(opts.workerFile);
    if(this.worker === 'undefined'){
      this.log.error('WebWorker initialization was not performed');
      return null;
    }
    opts.objName = 'SimObjForWebWorkers';
    SimilarityFunction.call(this, opts);
    this.refNum = 0;
    this.viewRefs = {};
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
      result[obj.newItem.k] = obj.newItem.v;
    if(obj.updateCluView){
      this.log.info('view received from worker');
      var viewRef = this.viewRefs[obj.refNum];
      this.exchageValues(viewRef, result);
      delete this.viewRefs[obj.refNum];
    }else
      this.coordinator.sendTo(obj.receiver, result, obj.protoId);
  };
  
  SimObjForWebWorkers.prototype.updateClusteringView = function(n, rcView, view){
    var keys = Object.keys(rcView);
    var result = this.checkBaseCase(n, rcView, null, null, null, keys, true);
    if(result === null){
      this.refNum++;
      this.viewRefs[this.refNum] = view;
      var payload = {
        'n': n,
        'view': rcView,
        'newItem': null,
        'receiver': null,
        'protoId': null,
        profile: this.profile,
        updateCluView: true,
        'refNum': this.refNum
      };
      this.worker.postMessage(payload);
    }else{
      this.exchageValues(view, result);
    }
  };
  
  SimObjForWebWorkers.prototype.exchageValues = function(oldView, newView){
      var i, keys;
      this.log.info('cluView before update: ' + JSON.stringify(oldView));
      keys = Object.keys(oldView);
      for(i = 0; i < keys.length; i++)
        delete oldView[ keys[i] ];
      keys = Object.keys(newView);
      for(i = 0; i < keys.length; i++)
        oldView[ keys[i] ] = newView[ keys[i] ];
      this.log.info('cluView after update: ' + JSON.stringify(oldView));
  };
  
  exports.SimObjForWebWorkers = SimObjForWebWorkers;
})(this);
