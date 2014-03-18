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
  protocols: [
    { name: 'Cyclon', 
      options: {
        viewSize: 10,
        gossipLenght: 5,
        periodTime: 10000,
        propagationPolicy: { push: true, pull: true }
      }
    },
    { name: 'Vicinity', 
      options: {
        viewSize: 10,
        gossipLenght: 5,
        periodTime: 10000,
        propagationPolicy: { push: true, pull: true },
        selectionPolicy: 'biased', // random OR biased OR agr-biased
        similarityFunction: {
          name: 'DumbProximityFunc',
          preference: 1
        }
      }
    }
  ],
  dependencies: [
    { rps: 'Cyclon',
      attribute: 'view'
    }
  ]
};

exe = new ClusteringExecutor( gossipOpts );

window.onunload = window.onbeforeunload = function(e) {
  if (!!exe && !exe.destroyed) {
    exe.destroy();
  }
};
