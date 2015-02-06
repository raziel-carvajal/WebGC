/**
*@module src/apis*/
(function(exp){
  /** 
  * @class SimilarityFunction
  * @description "Abstract class" for any implementation of a similarit 
  * @param profile - Profile of the local peer; this parame
  * @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr> */ 
  function SimilarityFunction(opts){
    this.log = new Logger(opts.loggingServer, opts.peerId, opts.objName);
    this.profile = opts.profile;
    this.coordinator = opts.coordinator;
    this.noImMsg = 'It is required to provide an implementation for this method';
  }
  
  SimilarityFunction.prototype.compute = function(a,b){throw this.noImMsg;};
  
  SimilarityFunction.prototype.checkBaseCase = 
    function(n, view, newItem, receiver, protoId, keys, getValue){
    if(newItem !== null)
      view[newItem.k] = newItem.v;
    if(n <= 0 || keys.length === 0){
      this.log.info('Base case SimFun. View is empty');
      if(getValue)
        return view;
      else{
        this.coordinator.sendTo(receiver, view, protoId);
        return true;
      }
    }
    if( keys.length < n ){
      this.log.info('Base case SimFun. view size: ' + keys.length + ', n: ' + n);
      if(getValue)
        return view;
      else{
        this.coordinator.sendTo(receiver, view, protoId);
        return true;
      }
    }
    if(getValue)
      return null;
    else
      return false;
  };
  
  SimilarityFunction.prototype.orderBySimilarity = function(values, n, view, nulls){
    this.log.info('Values before ordering: ' + JSON.stringify({'v': values}));
    values.sort( function(a,b){return a.v - b.v;} );
    this.log.info('Values after ordering: ' + JSON.stringify({'v': values}));
    var result = {};
    var i = 0;
    while(i < values.length && i < n){
      result[ values[i].k ] = view[ values[i].k ];
      i++;
    }
    var key;
    while(i < n){
      key = nulls.pop();
      result[key] = view[key];
      i++;
    }
    this.log.info('Final order is: ' + JSON.stringify(result));
    return result;
  };  
  /**
  * @description This method gets a subset with the n most similar items to the local peer from
  * the object view.
  * @method getClosestNeighbours
  * @param {Integer} n - Number of the most similar items to the local peer.
  * @param {Dictonary} view - Source where the most similar items are taken.
  * @returns {Dictionary} Subset of [view]{@link view}.*/
  SimilarityFunction.prototype.getClosestNeighbours = function(n, view, newItem, receiver, protoId){
    this.log.info('getClosestNeighbours()');
    var keys = Object.keys(view);
    if( !this.checkBaseCase(n, view, newItem, receiver, protoId, keys, false) ){
      var values = [], nulls = [];
      for(var i = 0; i < keys.length; i++){
        if( view[ keys[i] ].hasOwnProperty('data') && typeof view[ keys[i] ].data === 'number' )
          values.push({
            k: keys[i],
            v: this.compute(this.profile, view[ keys[i] ].data)
          });
        else
          nulls.push( keys[i] );
      }
      this.log.info('values: ' + JSON.stringify({'v': values}));
      this.log.info('nulls : ' + JSON.stringify({'v': nulls}));
      var result = this.orderBySimilarity(values, n, view, nulls);
      if(newItem !== null)
        result[newItem.k] = newItem.v;
      this.log.info('simFun.getCloNeigh() closestNeigh: ' + JSON.stringify(result));
      this.coordinator.sendTo(receiver, result, protoId);
    }
  };
  
  SimilarityFunction.prototype.updateClusteringView = function(n, rcView, view){
    this.log.info('updateClusteringView()');
    var keys = Object.keys(rcView), i;
    var result = this.checkBaseCase(n, rcView, null, null, null, keys, true);
    if(result === null || Object.keys(result).length === 0){
      var values = [], nulls = [];
      for(i = 0; i < keys.length; i++ ){
        if( rcView[ keys[i] ].hasOwnProperty('data') && typeof rcView[ keys[i] ].data === 'number' )
          values.push({
            k: keys[i],
            v: this.compute(this.profile, rcView[ keys[i] ].data)
          });
        else
          nulls.push( keys[i] );
      }
      result = this.orderBySimilarity(values, n, rcView, nulls);
    }
    this.log.info('cluView before update: ' + JSON.stringify(view));
    keys = Object.keys(view);
    for(i = 0; i < keys.length; i++)
      delete view[ keys[i] ];
    keys = Object.keys(result);
    for(i = 0; i < keys.length; i++)
      view[ keys[i] ] = result[ keys[i] ];
    this.log.info('cluView after update: ' + JSON.stringify(view));
  };
  
  exp.SimilarityFunction = SimilarityFunction;
})(this);
