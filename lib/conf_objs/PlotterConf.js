var plotterOpts = {
  plotterId: 'plotter',
  plotterTimeout: 20000,
  peerJsOpts: {
    host: 'localhost',
    port: 9000,
    debug: 3,
    logFunction: function(){
      var msg = Array.prototype.slice.call(arguments).join(' ');
      console.log(msg);
    }
  },
  loggingServer: {
    host: 'localhost',
    port: 9001
  },
  focusOn: 'peer_1'
};
