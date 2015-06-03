/**
*@module src/superObjs*/
(function(exp){
  /**
  * @class ViewSelector
  * @description Ranks items in a gossip view according to a similarity function, this function
  * evaluates to which extend two peer profiles differs from each other.
  * @param profile Profile of the local peer
  * @param log Logger (see [LoggerForWebWorker]{@link module:src/utils#LoggerForWebWorker}) to 
  * monitor the actions of the ViewSelector
  * @param simFunc Reference to the similarity function
  * @author Raziel Carvajal-Gomez <raziel.carvajal-gomez@inria.fr> <raziel.carvajal@gmail.com> */ 
  function ViewSelector(profile, log, simFunc){
    this.profile = profile;
    this.log = log;
    this.simFunc = simFunc;
    this.noImMsg = 'It is required to provide an implementation for this method';
  }
  
  /**
  * @method checkBaseCase
  * @description The view selection takes the N most similar items from the local peer's view of
  * length V. To speed up the peer selection, this method returns the peer's view if N is negative
  * or N > V
  * @param n N most similar peers to take from the peer's view
  * @param view Peer's view
  * @param newItem This item contains the ID of the local peer, the local peer's profile and its age
  * initialize to zero
  * @param keys Properties of the object that represents the local peer's view
  * @return Object Returns null if the base case does not happens or the local peer's view otherwise*/
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
  * @method getClosestNeighbours
  * @description This method gets the N most similar items in the local peer's view
  * @param n Number of the most similar items to the local peer
  * @param view Source where the most similar items are taken
  * @param newItem This item contains the ID of the local peer, the local peer's profile and its age
  * initialize to zero
  * @returns Object Subset of the local peer's view with the n most similar peers*/
  ViewSelector.prototype.getClosestNeighbours = function(n, view, newItem){
    var keys = Object.keys(view);
    var result = this.checkBaseCase(n, view, newItem, keys);
    if(result === null){
      result = this.getNsimilarPeers(view, n, keys);
      if(newItem !== null)
        result[newItem.k] = newItem.v;
    }
    return result;
  };
  
  /**
  * @method getNsimilarPeers
  * @description This method gets the N most similar items in the local peer's view
  * @param n Number of the most similar items to the local peer                                      
  * @param view Source where the most similar items are taken                                        
  * @param keys Properties of the object that represents the local peer's view
  * @returns Object Subset of the local peer's view with the n most similar peers*/                  
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
      itm.ev = values[i].v;
      itm.ev = itm.ev.toFixed(3);
      result[ values[i].k ] = itm;
      i++;
    }
    return result;
  };
  
  exp.ViewSelector = ViewSelector;
})(this);
