/**
*@module src/apis*/
(function(exp){
  function SimilarityFunction(profile){
    this.profile = profile;
    this.noImMsg = 'It is required to provide an implementation for this method';
  }
  SimilarityFunction.prototype.compute = function(a,b){throw this.noImMsg;};
  SimilarityFunction.prototype.getClosestNeighbours = function(n, view){throw this.noImMsg;};
  exp.SimilarityFunction = SimilarityFunction;
})(this);
