/**
*@module src/apis*/
(function(exp){
  /**
  * @class ViewSelector
  * @description "Abstract class" for any implementation of a similarit 
  * @param profile - Profile of the local peer; this parame
  * @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr> */ 
  function ViewSelector(profile, log, simFunc){
    this.profile = profile;
    this.log = log;
    this.simFunc = simFunc;
    this.noImMsg = 'It is required to provide an implementation for this method';
  }
  
  ViewSelector.prototype.checkBaseCase = function(n, view, newItem, keys){
    if(newItem !== null)
      view[newItem.k] = newItem.v;
    var msg;
    if(n <= 0 || keys.length === 0){
      this.log.info('Base case SimFun. View is empty');
      return view;
    }
    if(keys.length < n){
      this.log.info('Base case SimFun. view size: ' + keys.length + ', n: ' + n);
      return view;
    }
    return null;
  };
  /**
  * @description This method gets a subset with the n most similar items to the local peer from
  * the object view.
  * @method getClosestNeighbours
  * @param {Integer} n - Number of the most similar items to the local peer.
  * @param {Dictonary} view - Source where the most similar items are taken.
  * @returns {Dictionary} Subset of [view]{@link view}.*/
  ViewSelector.prototype.getClosestNeighbours = function(n, view, newItem){
    this.log.info('getClosestNeighbours()');
    var keys = Object.keys(view);
    var result = this.checkBaseCase(n, view, newItem, keys);
    if(result === null){
      result = this.getNsimilarPeers(view, n, keys);
      if(newItem !== null)
        result[newItem.k] = newItem.v;
    }
    this.log.info('simFun.getCloNeigh() closestNeigh: ' + JSON.stringify(result));
    return result;
  };
  
  ViewSelector.prototype.getNsimilarPeers = function(view, n, keys){
    var values = [], i;
    for(i = 0; i < keys.length; i++ ){
      values.push({
        k: keys[i],
        v: this.simFunc(this.profile, view[ keys[i] ].data, this.log)
      });
    }
    values.sort( function(a,b){return a.v - b.v;} );
    values.reverse();
    var result = {}, itm;
    i = 0;
    while(i < n && i < values.length){
      itm = view[ values[i].k ];
      itm.evalu = values[i].v;
      result[ values[i].k ] = itm;
      i++;
    }
    return result;
  };
  
  exp.ViewSelector = ViewSelector;
})(this);
