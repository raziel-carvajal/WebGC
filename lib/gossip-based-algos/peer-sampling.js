(function(exports){

function SamplingService(options){
  this.selectionPolicy = options.selectionPolicy;
  this.propagationPolicy = propagationPolicy;
  this.H = options.healing; this.S = options.swapped;
  this.C = options.viewSize; this.view = {};
  this.inVandNonReturned = {};
}

SamplingService.prototype._initialize = function(buffer){
  if( buffer.length !== 0 ){
    for( i in buffer ){
      this.view[ buffer[i].id ] = gossipUtil.newItem(0, buffer[i].data);
      this.inVandNonReturned[ buffer[i].id ] = 1;
    }
  }
}

SamplingService.prototype._selectPeer = function(policy){
  var peer = null;
  var keys = Object.keys(this.inVandNonReturned);
  if( keys.length === 0 ){
    console.log('WARNING: The quality of returned samples is no longer reliable');
    peer = gossipUtil.getRandomKey(this.view);
  }else{
    switch(policy){
    case 'random':
      peer = this.inVandNonReturned[ keys[0] ];
      break;
    case 'oldest':
      peer = gossipUtil.getOldestKey(this.inVandNonReturned);
      break;
    default:
      console.log('The selection policy is not recognized');
      return peer;
    }
    delete this.inVandNonReturned[peer];
  }
  return peer;
}

SamplingService.prototype._permuteView = function(){

}

SamplingService.prototype._select = function(buffer){

}

SamplingService.prototype._activeThread = function(){

}

SamplingService.prototype._passiveThread = function(){

}

exports.SamplingService = SamplingService;

})(this);
