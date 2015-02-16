(function(exports){
  function GossipMediator(algo, log, worker){
    this.algo = algo;
    this.log = log;
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
    setInterval(function(){
      self.log.info('Doing active thread with loop: ' + self.algo.loop);
      self.algo.selectItemsToSend('active');
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
      var msg = e.data;
      switch(msg.header){
        case 'firstView':
          self.log.info('First view received: ' + JSON.stringify({view: msg.view}));
          self.algo.initialize(msg.view);
          self.scheduleActiveThread();
          break;
        case 'passiveMsg':
          self.log.info('passive msg received from: ' + msg.emitter);
          self.algo.selectItemsToKeep(msg.payload);
          self.log.info('view after performing update: ' + JSON.stringify(self.algo.view));
          break;
        default:
          self.log.info('Header: ' + payload.header + ' is unkown');
          break;
      }
    }, false);
  };
  GossipMediator.prototype.postInMainThread = function(msg){ this.worker.postMessage(msg); };
  
  exports.GossipMediator = GossipMediator;
})(this);
