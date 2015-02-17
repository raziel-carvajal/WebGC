(function(exports){
  function GossipMediator(algo, log, worker){
    this.algo = algo;
    this.log = log;
    this.worker = worker;
    this.dependencies = {};
  }
  
  /***/
  GossipMediator.prototype.setDependencies = function(algoDependencies){
    var external, dep;
    for(var i = 0; i < algoDependencies.length; i++){
      dep = algoDependencies[i];
      external = exports[dep.algoId] === 'undefined' ? true : false;
      this.dependencies[dep.algoId] = {property: dep.algoAttribute, isExternal: external};
    }
  };
  
  GossipMediator.prototype.scheduleActiveThread = function(){
    var self = this;
    setInterval(function(){
      self.log.info('active thread at loop: ' + self.algo.loop + ', view: ' + JSON.stringify(self.algo.view));
      self.algo.selectItemsToSend('active');
      self.algo.loop++;
      self.algo.increaseAge();
    }, this.algo.gossipPeriod);
  };
  
  /***/
  GossipMediator.prototype.doGossipCallback = function(msg){
    var funcToCall = this.algo[msg.funcToExe];
    if(funcToCall === 'function')
      funcToCall(msg.params);
  };
  
  /***/
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
      var msg = e.data;
      switch(msg.header){
        case 'firstView':
          self.algo.initialize(msg.view);
          self.scheduleActiveThread();
          break;
        case 'passiveMsg':
          self.log.info('passive msg with payload: ' + JSON.stringify(msg));
          self.algo.selectItemsToKeep(msg.payload);
          break;
        default:
          self.log.warn('header: ' + payload.header + ' is unknown');
          break;
      }
    }, false);
  };
  
  GossipMediator.prototype.postInMainThread = function(msg){ this.worker.postMessage(msg); };
  
  exports.GossipMediator = GossipMediator;
})(this);
