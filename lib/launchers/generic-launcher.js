var vicinity = { 
  name: 'Vicinity',
  data: '?',
  viewSize: 10,
  gossipLenght: 5,
  periodTime: 10000,
  propagationPolicy: { push: true, pull: true },
  selectionPolicy: 'biased', // random OR biased OR agr-biased
  similarityFunction: 'DumbProximityFunc'
};

var cyclon = {
  name: 'Cyclon',
  data: '?',
  viewSize: 10,
  gossipLenght: 5,
  periodTime: 10000,
  propagationPolicy: { push: true, pull: true }
};

var rps = {
  name: 'SamplingService',
  data: '?',
  viewSize: 10,
  gossipLenght: 5,
  periodTime: 10000,
  propagationPolicy: { push: true, pull: true },
  selectionPolicy: 'random', // random OR oldest
  H: '?',
  S: '?'
};

var vicinityDep1 = { 
  obj: 'Viciniy',
  objAtt: 'rpsView',
  dependency: 'Cyclon',
  dependencyAtt: 'view'
};

var vicinityDep2 = {
  obj: 'Vicinity',
  objAtt: 'data',
  dependency: 'Cyclon',
  dependencyAtt: 'data'
};

var gossipOpts = {
  peerServer: {
    host: 'localhost',
    port: 9000,
    debug: 3,
    logFunction: function(){
      var copy = Array.prototype.slice.call(arguments).join(' ');
      console.log(copy);
    }
  },
  protocols: [ cyclon ],
  dependencies: [ ]
};

exe = new Coordinator( gossipOpts );

window.onunload = window.onbeforeunload = function(e) {
  if (!!exe && !exe.destroyed) {
    exe.destroy();
  }
};
