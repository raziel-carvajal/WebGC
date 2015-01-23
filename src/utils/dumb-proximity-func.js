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
    if( typeof opts.value !== 'number' || opts.value < 0 )
      throw 'The preference is not valid';
    else
      this.proxVal = opts.value;
  }
  /**
  * @description This method computes the absolute value of the diference among a and b.
  * @method _eval
  * @param {Integer} a - Preference of the first peer.
  * @param {Integer} b - Preference of the second peer.
  * @returns {Integer} Absolute value of (a - b).*/
  DumbProximityFunc.prototype._eval = function(a, b){
    if( !(typeof a === 'number' && typeof b === 'number') ){
      this.log.warn('ProximityFunc: eval() with non numbers');
      return null;
    }
    return Math.abs(a - b);
  };
  /**
  * @description This method gets a subset with the n most similar items to the local peer from
  * the object dict.
  * @method _getClosestSubdic
  * @param {Integer} n - Number of the most similar items to the local peer.
  * @param {Dictonary} dict - Source where the most similar items are taken.
  * @returns {Dictionary} Subset of [dict]{@link dict}.*/
  DumbProximityFunc.prototype._getClosestSubdic = function(n, dict){
    var keys = Object.keys(dict);
    if( n <= 0 || keys.length === 0 )
      return {};
    if( keys.length <= n )
      return dict;
    var values = [], nulls = [], i;
    for( i = 0; i < keys.length; i++ ){
      if( dict[ keys[i] ].hasOwnProperty('data') && typeof dict[ keys[i] ].data === 'number' )
        values.push({
          k: keys[i],
          v: this._eval(this.proxVal, dict[ keys[i] ].data)
        });
      else
        nulls.push( keys[i] );
    }
    values.sort( function(a,b){return a.v - b.v;} );
    var result = {};
    i = 0;
    while(i < values.length && i < n){
      result[ values[i].k ] = dict[ values[i].k ];
      i++;
    }
    var key;
    while(i < n){
      key = nulls.pop();
      result[key] = dict[key];
      i++;
    }
    this.log.info('closest neighbours: ' + JSON.stringify(result));
    return result;
  };
  
  exports.DumbProximityFunc = DumbProximityFunc;
})(this);
