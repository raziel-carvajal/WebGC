(function(exports){
  function GossipMediator(algo, log, worker){
    this.algo = algo;
    this.log = log;
    this.worker = worker;
    this.dependencies = {};
    if(!this.log.isActivated){ this.logHistoryKey = 0; }
  }
  
  /***/
  GossipMediator.prototype.setDependencies = function(algoDependencies){
    var external, dep;
    for(var i = 0; i < algoDependencies.length; i++){
      dep = algoDependencies[i];
      external = typeof exports[dep.algoId] === 'undefined' ? true : false;
      this.dependencies[dep.algoId] = {property: dep.algoAttribute, isExternal: external};
    }
  };
  
  GossipMediator.prototype.scheduleActiveThread = function(){
    var self = this;
    setInterval(function(){
      //self.log.info('Doing active thread...');
      //var s = 'active thread at loop: ' + self.algo.loop + ', algoId: ' + self.algo.algoId +
      //  ', profile: ' + self.algo.data + ', view: ' + JSON.stringify(self.algo.view);
      //self.log.info(s);
      self.algo.selectItemsToSend('active');
      //var msg = {
      //  header: 'log',
      //  log: {
      //    algoId: self.algo.algoId,
      //    cycle: self.algo.loop,
      //    view: JSON.stringify(self.algo.view)
      //  }
      //};
      //self.postInMainThread(msg);
      self.algo.loop++;
      self.algo.increaseAge();
    }, this.algo.gossipPeriod);
  };
  
  /***/
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
          msg.view = self.algo.view;
          var t = self.algo.class === 'Vicinity' ? 'clu' : 'rps';
          msg.type = t;
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
