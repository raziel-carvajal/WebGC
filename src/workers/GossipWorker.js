(function(exports){
  function GossipMediator(logServerOpts, algo, postWorkerFunc){
    this.log = new Logger(logServerOpts, 'GossipMediator');
    this.algo = algo;
    this.postInMainThread = postWorkerFunc;
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
    this.activeRef = setInterval(this.algo.selectItemsToSend, this.algo.gossipPeriod);
  };
  GossipMediator.prototype.handleGossipPassiveMsg = function(emittersView){
    this.algo.selectItemsToKeep(emittersView);
  };
  GossipMediator.prototype.handleGossipAttribute = function(msg){
    var funcToCall = this.algo[msg.funcToExe];
    funcToCall(msg.attributeValue);
  };
  GossipMediator.prototype.doPrOfDependencie = function(objectId, funcToExe){
    if(this.dependencies.hasOwnProperty(objectId)){
      var dep = this.dependencies[depId];
      if(dep.isExternal){
        var msg = {
          algoId: dep.property,
          property: dep.property,
          'funcToExe': funcToExe
        };
        this.postInMainThread(msg);
      }else{
        msg = {};
      }
    }else{
      this.log.error('Dependencie: ' + depId + ' is not recognized');
    }
    var msg = {
      header: 'getGossipAttribute',
      'algoId': algoId,
      'attribute': attribute,
      'funcToExe': funcToExe
    };
    this.postInMainThread(msg);
  };
  exports.GossipMediator = GossipMediator;
})(this);
