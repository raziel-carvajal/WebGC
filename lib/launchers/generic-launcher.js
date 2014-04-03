var cyclon = {
  object: 'Cyclon',
  iD: 'cyclon1',
  data: '?',
  viewSize: 10,
  gossipLength: 5,
  periodTime: 10000,
  propagationPolicy: { push: true, pull: true }
};

var vicinity = { 
  object: 'Vicinity',
  iD: 'vicinity1',
  data: 1,
  viewSize: 10,
  gossipLength: 5,
  periodTime: 10000,
  propagationPolicy: { push: true, pull: true },
  selectionPolicy: 'biased', // random OR biased OR agr-biased
  similarityFunction: 'DumbProximityFunc',
  dependencies: [
    { localAtt: 'rpsView',
      objectId: 'cyclon1',
      externalAtt: 'view' }
  ]
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
  protocols: [ cyclon, vicinity ]
};

var exe = new Coordinator( gossipOpts );

window.onunload = window.onbeforeunload = function(e) {
  if (!!exe && !exe.destroyed) {
    exe.destroy();
  }
};
