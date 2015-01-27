/**
*@module src/apis*/
(function(exp){
  function SimilarityFunction(profile){
    this.profile = profile;
    this.noImMsg = 'It is required to provide an implementation for this method';
  }
  SimilarityFunction.prototype.compute = function(a,b){throw this.noImMsg;};
  /**
  * @description This method gets a subset with the n most similar items to the local peer from
  * the object view.
  * @method _getClosestSubdic
  * @param {Integer} n - Number of the most similar items to the local peer.
  * @param {Dictonary} view - Source where the most similar items are taken.
  * @returns {Dictionary} Subset of [view]{@link view}.*/
  SimilarityFunction.prototype.getClosestNeighbours = function(n, view){
    var keys = Object.keys(view);
    if( n <= 0 || keys.length === 0 )
      return {};
    if( keys.length <= n )
      return view;
    var values = [], nulls = [], i;
    for( i = 0; i < keys.length; i++ ){
      if( view[ keys[i] ].hasOwnProperty('data') && typeof view[ keys[i] ].data === 'number' )
        values.push({
          k: keys[i],
          v: this.compute(this.profile, view[ keys[i] ].data)
        });
      else
        nulls.push( keys[i] );
    }
    values.sort( function(a,b){return a.v - b.v;} );
    var result = {};
    i = 0;
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
    this.log.info('View after evaluation: ' + JSON.stringify(result));
    return result;
  };
  exp.SimilarityFunction = SimilarityFunction;
})(this);
