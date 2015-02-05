/**
*@module src/apis*/
(function(exp){
  /** 
  * @class SimilarityFunction
  * @description "Abstract class" for any implementation of a similarit 
  * @param profile - Profile of the local peer; this parame
  * @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr> */ 
  function SimilarityFunction(opts){
    this.profile = opts.profile;
    this.coordinator = opts.coordinator;
    this.noImMsg = 'It is required to provide an implementation for this method';
    //this property must be initialized in the constructor of
    //the clustering protocol
    //this.cluView = null;
  }
  
  SimilarityFunction.prototype.compute = function(a,b){throw this.noImMsg;};
  
  SimilarityFunction.prototype.checkBaseCase = 
    function(n, view, newItem, receiver, protoId, keys, getValue){
    var r = {};
    if(newItem !== null)
      r[newItem.k] = newItem.v;
    if(n <= 0 || keys.length === 0){
      if(getValue)
        return r;
      else{
        this.coordinator.sendTo(receiver, r, protoId);
        return true;
      }
    }
    if( keys.length <= n ){
      for(var i = 0; i < keys.length; i++)
        r[ keys[i] ] = view[ keys[i] ];
      if(getValue)
        return r;
      else{
        this.coordinator.sendTo(receiver, r, protoId);
        return true;
      }
    }
    if(getValue)
      return null;
    else
      return false;
  };
  
  SimilarityFunction.prototype.orderBySimilarity = function(values, n, view, nulls){
    values.sort( function(a,b){return a.v - b.v;} );
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
    var keys = Object.keys(view);
    if( !this.checkBaseCase(n, view, newItem, receiver, protoId, keys, false) ){
      var values = [], nulls = [];
      for(var i = 0; i < keys.length; i++ ){
        if( view[ keys[i] ].hasOwnProperty('data') && typeof view[ keys[i] ].data === 'number' )
          values.push({
            k: keys[i],
            v: this.compute(this.profile, view[ keys[i] ].data)
          });
        else
          nulls.push( keys[i] );
      }
      var result = this.orderBySimilarity(values, n, view, nulls);
      if(newItem !== null)
        result[newItem.k] = newItem.v;
      this.coordinator.sendTo(receiver, result, protoId);
    }
  };
  
  SimilarityFunction.prototype.updateClusteringView = function(n, view){
    var keys = Object.keys(view), i;
    var result = this.checkBaseCase(n, view, null, null, null, keys, true);
    if(result === null){
      var values = [], nulls = [];
      for(i = 0; i < keys.length; i++ ){
        if( view[ keys[i] ].hasOwnProperty('data') && typeof view[ keys[i] ].data === 'number' )
          values.push({
            k: keys[i],
            v: this.compute(this.profile, view[ keys[i] ].data)
          });
        else
          nulls.push( keys[i] );
      }
      result = this.orderBySimilarity(values, n, view, nulls);
    }
    //clustring protocol view will be updated here!!!
    this.cluView = {};
    keys = Object.keys(result);
    for(i = 0; i < keys.length; i++)
      this.cluView[ keys[i] ] = result[ keys[i] ];
  };
  
  exp.SimilarityFunction = SimilarityFunction;
})(this);
