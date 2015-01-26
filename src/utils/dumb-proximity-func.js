/**
* @module lib/utils
* @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr>*/
(function(exports){
 /** 
  * @class DumbProximityFunc
  * @description This class implements a basic similarity function. The result of applying
  * this function amog two peers is computing the difference of the preferences of both peers.
  * @param {Integer} value - Preference of the local peer.*/
  function DumbProximityFunc(opts){
    this.log = new Logger(opts.loggingServer, opts.peerId, this.constructor.name);
    if( typeof opts.profile !== 'number' || opts.profile < 0 )
      throw 'The preference is not valid';
    //calling this function initialize the profile of the user (profile propertie in opts)
    SimilarityFunction.call(this, opts.profile);
  }
  util.inherits(DumbProximityFunc, SimilarityFunction);
  /**
  * @description This method computes the absolute value of the diference among a and b.
  * @method _eval
  * @param {Integer} a - Preference of the first peer.
  * @param {Integer} b - Preference of the second peer.
  * @returns {Integer} Absolute value of (a - b).*/
  DumbProximityFunc.prototype.compute = function(a, b){
    if( !(typeof a === 'number' && typeof b === 'number') ){
      this.log.warn('ProximityFunc: eval() with non numbers');
      return null;
    }
    return Math.abs(a - b);
  };
  /**
  * @description This method gets a subset with the n most similar items to the local peer from
  * the object view.
  * @method _getClosestSubdic
  * @param {Integer} n - Number of the most similar items to the local peer.
  * @param {Dictonary} view - Source where the most similar items are taken.
  * @returns {Dictionary} Subset of [view]{@link view}.*/
  DumbProximityFunc.prototype.getClosestNeighbours = function(n, view){
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
    return result;
  };
  
  exports.DumbProximityFunc = DumbProximityFunc;
})(this);
