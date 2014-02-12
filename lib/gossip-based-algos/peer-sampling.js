(function(exports){

function SamplingService(options){
  this.selectionPolicy = options.selectionPolicy;
  this.propagationPolicy = {};
  this.propagationPolicy['push'] = options.propagationPolicyPush;
  this.propagationPolicy['pull'] = options.propagationPolicyPull;
  this.H = options.healing; this.S = options.swap;
  this.C = options.viewSize; this.view = {};
  this.inVandNonReturned = {};
}

SamplingService.prototype._initialize = function(buffer){
  if( buffer.length !== 0 ){
    for( var i = 0; i < buffer.length; i += 1 ){
      this.view[ buffer[i] ] = gossipUtil.newItem(0, 'null');
      this.inVandNonReturned[ buffer[i] ] = 1;
    }
  }
}

SamplingService.prototype._selectPeer = function(){
  var peer; var keys = Object.keys(this.inVandNonReturned);
  if( keys.length === 0 ){
    console.log('WARNING: The quality of returned samples is no longer reliable');
    peer = gossipUtil.getRandomKey(this.view);
  }else{
    switch( this.selectionPolicy ){
      case 'random':
        peer = keys[0];
        break;
      case 'oldest':
        peer = gossipUtil.getOldestKey(this.view);
        break;
      default:
        console.log('The selection policy is not recognized');
        return null;
    }
    delete this.inVandNonReturned[peer];
  }
  return peer;
}

SamplingService.prototype._permuteView = function(){
  var keys = Object.keys(this.view);
  if( keys.length === 0 || keys.length === 1 )
    return;
  else{
    var tmpDic = {}, permutation = {}, tmpAr = [], i, key;
    for( i = 0; i < keys.length; i +=1 )
      tmpDic[ keys[i] ] = 1;
    for( i = 0; i < keys.length; i += 1){
      tmpAr = Object.keys(tmpDic);
      key = tmpAr[ Math.floor(Math.random() * tmpAr.length) ];
      permutation[key] = this.view[key];
      delete tmpDic[key]; delete this.view[key];
    }
    for( key in permutation )
      this.view[key] = permutation[key];
  }
}

SamplingService.prototype._moveOldest = function(){
  if( Object.keys(this.view).length > this.H && this.H > 0 ){
    var oldests = [], oldestKey, i;
    for( i = 0; i < this.H; i += 1 ){
      oldestKey = gossipUtil.getOldestKey(this.view);
      oldests[i] = { key: oldestKey, value: this.view[oldestKey] };
      delete this.view[oldestKey];
    }
    oldests.sort( function(a,b){ return a.value.age - b.value.age } );
    for( i = 0; i < oldests.length; i += 1 )
      this.view[ oldests[i].key ] = oldests[i].value;
  }
}

SamplingService.prototype._select = function(buffer){
  var key;
  for( key in buffer ){
    if( key in this.view ){
      if( buffer[key].age < this.view[key].age )
        this.view[key] = buffer[key];
    }
    else
      this.view[key] = buffer[key];
  }

  var oldest, toRemove; var i;
  toRemove = Math.min(this.H, Object.keys(this.view).length - this.C);
  for( i = 0; i < toRemove; i += 1 ){
    oldest = gossipUtil.getOldestKey(this.view);
    delete this.view[oldest];
  }

  toRemove = Math.min(this.S, Object.keys(this.view).length - this.C);
  var keys = Object.keys(this.view);
  for( i = 0; i < toRemove; i += 1 )
    delete this.view[ keys[i] ];

  keys = Object.keys(this.view);
  if( keys.length > this.C )
    gossipUtil.removeRandomly(keys.length - this.C, this.view);

  // Queue update
  keys = Object.keys(this.inVandNonReturned);
  for( i = 0; i < keys.length; i += 1 ){
    if( !(keys[i] in this.view) )
      delete this.inVandNonReturned[ key[i] ];
  }
  keys = Object.keys(this.view);
  for( i = 0; i < keys.length; i += 1 ){
    if( !(keys[i] in this.inVandNonReturned) )
      this.inVandNonReturned[ keys[i] ] = 1;
  }
}

SamplingService.prototype._getItemsToSend = function(iD){
  var buffer = {}; buffer[iD] = gossipUtil.newItem(0, 'null');
  this._permuteView();
  this._moveOldest();
  var ii = Math.floor(this.C / 2) - 1;
  var keys = Object.keys(this.view);
  if( keys.length >= ii ){
    for( var i = 0; i < ii; i += 1 )
      buffer[ keys[i] ] = this.view[ keys[i] ];
  }
  return buffer;
}

SamplingService.prototype._increaseAge = function(){
  for( var key in this.view )
    this.view[key].age += 1;
}

SamplingService.prototype._getLog = function(){
  var trace = '['; var limit;
  var keys = Object.keys(this.view);
  if( keys.length == 0 )
    trace += ']';
  else{
      limit = keys.length - 1;
      for(var i = 0; i < limit; i += 1)
        trace += '(' + keys[i] + ', ' + this.view[ keys[i] ].age + '), ';
      trace += '(' + keys[limit] + ', ' + this.view[ keys[limit] ].age + ')]';
    }
  return trace;
}

exports.SamplingService = SamplingService;

})(this);
