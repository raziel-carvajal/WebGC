(function(exports){

  function DumbProximityFunc(value){
    this.proxVal = value;
  }

  DumbProximityFunc.prototype._eval = function(a, b){
    if( !(typeof a === 'number' && typeof b === 'number') ){
      console.log('ProximityFunc: eval() with non numbers');
      return null;
    }
    return Math.abs(a - b);
  };

  DumbProximityFunc.prototype._getClosestSubdic = function(n, dict){
    var keys = Object.keys(dict);
    if( n <= 0 || keys.length === 0 )
      return {};
    if( keys.length <= n )
      return dict;
    var values = [], key, value;
    for( key in dict ){
      if( 'data' in dict[key] )
        value = this._eval(this.proxVal, dict[key].data);
      else
        value = null;
      values.push( {k: key, v: value} );
    }
    values.sort( function(a,b){return a.v - b.v;} );
    var result = {}, nulls = [];
    for( var i = 0, ii = values.length; i < ii; i += 1 ){
      key = values[i].k;
      value = values[i].v;
      if( value === null )
        nulls.push(i);
      else{
        if( Object.keys(result).length < n )
          result[key] = dict[key];
        else
          break;
      }
    }
    var indx;
    while( Object.keys(result).length < n){
      indx = nulls.pop();
      key = values[indx].k;
      result[key] = dict[key];
    }
    return result;
  };

  exports.DumbProximityFunc = DumbProximityFunc;
})(this);
