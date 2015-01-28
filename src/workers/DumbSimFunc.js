var globalView = {};


function compute(a,b){
  if( !(typeof a === 'number' && typeof b === 'number') )
    return null;
  return Math.abs(a - b);
}

onmessage = function(event){
  var obj = JSON.parse(event.data);
  var props = Object.keys(obj.view);
  var view = obj.view;
  for(var i = 0; i < props.length; i++){
    if(view[ props[i] ].hasOwnProperty('data') && typeof view[ props[i] ].data === 'number')
      globalView[ props[i] ] = compute(obj.profile, view[ props[i] ].data);
  }
  var payload = JSON.stringify(globalView);
  postMessage(payload);
};

