function compute(a,b){
  if( !(typeof a === 'number' && typeof b === 'number') )
    return null;
  return Math.abs(a - b);
}

onmessage = function(event){
  var obj = event.data;
  var props = Object.keys(obj.view);
  var view = obj.view;
  var evals = {};
  for(var i = 0; i < props.length; i++){
    if( view[ props[i] ].hasOwnProperty('data') )
      evals[ props[i] ] = compute(obj.profile, view[ props[i] ].data);
  }
  obj.evaluation = evals;
  postMessage(obj);
};

