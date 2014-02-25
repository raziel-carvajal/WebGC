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
    var values = []; var resuEv, key;
    for( key in dict ){
      if( 'data' in dict[key] )
        resuEv = this._eval(this.proxVal, dict[key].data);
      else
        resuEv = null;
      values.push( {id: key, value: resuEv} );
    }
    values.sort( function(a,b){ return a.value - b.value; } );
    var result = {}, nulls = [], indx;
    for( var i = 0; i < n; i += 1 ){
      if( values[i].value !== null ){
        key = values[i].id;
        result[key] = dict[key];
      }else
        nulls.push(i);
    }
    while( Object.keys(result).length < n ){
      indx = nulls.pop();
      key = values[indx].id;
      result[key] = dict[key];
    }
    return result;
  };

  exports.DumbProximityFunc = DumbProximityFunc;
})(this);
