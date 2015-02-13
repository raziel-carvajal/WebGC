/**
*@module src/apis*/
(function(exp){
  /** 
  * @class SimilarityFunction
  * @description "Abstract class" for any implementation of a similarit 
  * @param profile - Profile of the local peer; this parame
  * @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr> */ 
  function SimilarityFunction(opts){
    this.log = opts.log;
    this.profile = opts.profile;
    this.gossipMediator = opts.gossipMediator;
    this.newMainThreadMsg = opts.msgMTConstructor;
    this.noImMsg = 'It is required to provide an implementation for this method';
  }
  
  SimilarityFunction.prototype.compute = function(a,b){throw this.noImMsg;};
  
  SimilarityFunction.prototype.checkBaseCase = 
    function(n, view, newItem, receiver, protoId, keys, getValue){
    if(newItem !== null)
      view[newItem.k] = newItem.v;
    var msg;
    if(n <= 0 || keys.length === 0){
      this.log.info('Base case SimFun. View is empty');
      if(getValue)
        return view;
      else{
        msg = this.newMainThreadMsg(receiver, protoId, view);
        this.gossipMediator.postInMainThread(msg);
        return true;
      }
    }
    if( keys.length < n ){
      this.log.info('Base case SimFun. view size: ' + keys.length + ', n: ' + n);
      if(getValue)
        return view;
      else{
        msg = this.newMainThreadMsg(receiver, protoId, view);
        this.gossipMediator.postInMainThread(msg);
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
      var result = this.getNsimilarPeers(view, n, keys);
      if(newItem !== null)
        result[newItem.k] = newItem.v;
      this.log.info('simFun.getCloNeigh() closestNeigh: ' + JSON.stringify(result));
      var msg = this.newMainThreadMsg(receiver, protoId, result);
      this.gossipMediator.postInMainThread(msg);
    }
  };
  
  SimilarityFunction.prototype.updateClusteringView = function(n, rcView, view){
    this.log.info('updateClusteringView()');
    var keys = Object.keys(rcView), i;
    var result = this.checkBaseCase(n, rcView, null, null, null, keys, true);
    if(result === null || Object.keys(result).length === 0)
      result = this.getNsimilarPeers(rcView, n, keys);
    this.log.info('cluView before update: ' + JSON.stringify(view));
    keys = Object.keys(view);
    for(i = 0; i < keys.length; i++)
      delete view[ keys[i] ];
    keys = Object.keys(result);
    for(i = 0; i < keys.length; i++)
      view[ keys[i] ] = result[ keys[i] ];
    this.log.info('cluView after update: ' + JSON.stringify(view));
  };
  
  SimilarityFunction.prototype.getNsimilarPeers = function(view, n, keys){
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
    this.log.info('values: ' + JSON.stringify({'v': values}));
    this.log.info('nulls : ' + JSON.stringify({'v': nulls}));
    return this.orderBySimilarity(values, n, view, nulls);
  };
  
  exp.SimilarityFunction = SimilarityFunction;
})(this);
