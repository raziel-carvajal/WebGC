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
  var values = []; var itm, resuEv, key;
  for( key in keys ){
    resuEv = this._eval(this.proxVal, dict[key].payload);
    itm = { id: key, value: resuEv };
    values.push(itm);
  }
  values.sort(function(a,b){
    return (a.value - b.value);
  });
  var result = {}, value;
  for( var i = 0; i < n; i += 1){
    key = values[i].id;
    value = dict[key];
    result[key] = value;
  }
  return result;
};

exports.DumbProximityFunc = DumbProximityFunc;
})(this);
