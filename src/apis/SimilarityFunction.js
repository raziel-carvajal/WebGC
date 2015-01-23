/**
*@module src/apis*/
(function(exp){
  function SimilarityFunction(opts){
    this.profile = opts.profile;
    this.noImMsg = 'It is required to provide an implementation for this method';
  }
  /**
  * @method createInstance
  * @desc This method creates an instance of the similarity function that Vicinity uses for
  * the creation of clusters
  * @param {String} nameF - Class's name of the similarity function. */
  SimilarityFunction.prototype.createInstance = function(opts){
    var func;
    try{
      if( typeof opts.nameF !== 'string' )
        throw 'The name of the function must be a string';
      var constructor = exports[opts.nameF];
      if( typeof constructor === 'undefined' )
        throw 'Similarity function does not exist in the library of the system';
      func = new constructor(opts);
    }catch(e){
      this.log.error('Similarity function was not instantiaed. ' + e);
    }
    return func;
  };
  SimilarityFunction.prototype.compute = function(a,b){throw this.noImMsg;};
  SimilarityFunction.prototype.getClosestNeighbours = function(n, view){throw this.noImMsg;};
  exp.SimilarityFunction = SimilarityFunction;
})(this);
