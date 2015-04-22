(function(exports){
  function GossipMediator(algo, log, worker){
    this.algo = algo;
    this.log = log;
    this.worker = worker;
    this.dependencies = {};
    if(!this.log.isActivated){
      this.viewUpdsLogCounter = 0;
      this.activCycLogCounter = 0;
    }
  }
  
  GossipMediator.prototype.setDependencies = function(algoDependencies){
    var external, dep;
    for(var i = 0; i < algoDependencies.length; i++){
      dep = algoDependencies[i];
      external = typeof exports[dep.algoId] === 'undefined' ? true : false;
      this.dependencies[dep.algoId] = {property: dep.algoAttribute, isExternal: external};
    }
  };
  
  GossipMediator.prototype.sentActiveCycleStats = function(){
    this.activCycLogCounter++;
    var now = new Date();
    var msg = {
      header: 'actCycLog',
      algoId: this.algo.algoId,
      loop: this.algo.loop,
      counter: this.activCycLogCounter,
      'offset': (now - this.lastActCycTime) / 1000,
    };
    this.lastActCycTime = now;
    this.postInMainThread(msg);
  };
  
  GossipMediator.prototype.scheduleActiveThread = function(){
    this.lastActCycTime = new Date();
    var self = this;
    setInterval(function(){
      var log = {
        loop: self.algo.loop,
        algoId: self.algo.algoId,
        view: JSON.stringify(self.algo.view)
      };
      self.postInMainThread({
        header: 'logInConsole',
        log: JSON.stringify(log)
      });
      //first try for mesuring stats (not a good idea)
      //self.sentActiveCycleStats();
      //performing periodic gossip selection (no changes in view are done)
      self.algo.selectItemsToSend('active');
      self.algo.loop++;
      self.algo.increaseAge();
    }, this.algo.gossipPeriod);
  };
  
  GossipMediator.prototype.applyDependency = function(msg){
    if(this.dependencies.hasOwnProperty(msg.depId)){
      var dep = this.dependencies[msg.depId];
      if(dep.isExternal)
        this.postInMainThread(msg);
      else{
        var objInWorker = exports[msg.depId];
        var obj = objInWorker[msg.depAtt];
        if(objInWorker !== 'undefined' && typeof obj === 'object'){
          msg.result = obj;
          msg.callback(msg);
        }else
          this.log.error('dependency obj is not in worker scope');
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
        case 'incomingMsg':
          self.log.info('Updating view...');
          self.log.info('Current view: ' + JSON.stringify(self.algo.view));
          self.log.info('Merge with  : ' + JSON.stringify(msg.payload));
          self.algo.selectItemsToKeep(msg);
          break;
        case 'getDep':
          var obj = self.algo[msg.depAtt];
          if(obj !== 'undefined'){
            msg.header = 'setDep';
            msg.result = obj;
            self.worker.postMessage(msg);
          }else
            self.log.error('attribute ' + msg.depAtt + ' does not exists');
          break;
        case 'applyDep':
          self.algo[msg.callback](msg);
          break;
        case 'view':
          msg.header = 'drawGraph';
          msg.view = Object.keys(self.algo.view);
          msg.algoId = self.algo.algoId;
          self.worker.postMessage(msg);
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
