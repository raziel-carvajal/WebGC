eval("var f = function(a,b){return a+b;}");
function compute(e){
  if(e.data === 'eval'){
    var msg = f(5,6);
    postMessage(msg);
  }
}

addEventListener('message', compute, false);
