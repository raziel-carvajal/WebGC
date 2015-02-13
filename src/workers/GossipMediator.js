(function(exports){
  function GossipMediator(logServerOpts, algo, worker){
    this.log = new Logger(logServerOpts, 'GossipMediator');
    this.algo = algo;
    this.worker = worker;
    this.dependencies = {};
  }
  GossipMediator.prototype.setDependencies = function(algoDependencies){
    var external, dep;
    for(var i = 0; i < algoDependencies.length; i++){
      dep = algoDependencies[i];
      if(exports[ dep.objId ] === 'undefined')
        external = true;
      else
        external = false;
      this.dependencies[ dep.objId ] = {property: dep.property, isExternal: external};
    }
  };
  GossipMediator.prototype.scheduleActiveThread = function(){
    var self = this;
    this.activeRef = setInterval(function(){
      self.algo.selectItemsToSend();
      self.algo.loop++;
    }, this.algo.gossipPeriod);
  };
  GossipMediator.prototype.handlePassiveCycle = function(emittersView){
    this.algo.selectItemsToKeep(emittersView);
  };
  GossipMediator.prototype.doGossipCallback = function(msg){
    var funcToCall = this.algo[msg.funcToExe];
    if(funcToCall === 'function')
      funcToCall(msg.params);
  };
  GossipMediator.prototype.applyDependency = function(objectId, funcToExe, params){
    if(this.dependencies.hasOwnProperty(objectId)){
      var dep = this.dependencies[objectId];
      if(dep.isExternal){
        var msg = {
          receiver: objectId,
          property: dep.property,
          emitter: this.algo.algoId,
          'funcToExe': funcToExe
        };
        this.postInMainThread(msg);
      }else{
        var objInWorker = exports[objectId];
        var objFunc = objInWorker[dep.property];
        if(objInWorker !== 'undefined' && objFunc === 'function'){
          var result = objFunc(params);
          funcToExe(result);
        }
      }
    }else{
      this.log.error('dependency: ' + depId + ' is not recognized');
    }
  };
  GossipMediator.prototype.listen = function(){
    var self = this;
    this.worker.addEventListener('message', function(e){
      var payload = e.data;
      switch(payload.answer){
        case 'firstView':
          self.algo.initialize(payload.view);
          self.scheduleActiveThread();
          break;
      }
    }, false);
  };
  GossipMediator.prototype.postInMainThread = function(msg){ this.worker.postMessage(msg); };
  
  exports.GossipMediator = GossipMediator;
})(this);
