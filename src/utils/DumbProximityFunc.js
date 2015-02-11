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
    if( typeof opts.profile !== 'number' || opts.profile < 0 )
      throw 'The preference is not valid';
    //calling this function initialize the profile of the user (profile propertie in opts)
    opts.objName = 'DumbProximityFunc';
    SimilarityFunction.call(this, opts);
  }
  util.inherits(DumbProximityFunc, SimilarityFunction);
  /**
  * @description This method computes the absolute value of the diference among a and b.
  * @method compute
  * @param {Integer} a - Preference of the first peer.
  * @param {Integer} b - Preference of the second peer.
  * @returns {Integer} Absolute value of (a - b).*/
  DumbProximityFunc.prototype.compute = function(a, b){
    this.log.info('a: ' + a + ' - b: ' + b);
    if( !(typeof a === 'number' && typeof b === 'number') ){
      this.log.warn('ProximityFunc: eval() with non numbers');
      return null;
    }
    return Math.abs(a - b);
  };
  
  exports.DumbProximityFunc = DumbProximityFunc;
})(this);
