var plotterOpts = {
  plotterId: 'plotter',
  buildTimeOut: 15000,
  peerJsOpts: {
    host: 'localhost',
    port: 9000,
    debug: 3,
    logFunction: function(){
      var msg = Array.prototype.slice.call(arguments).join(' ');
      console.log(msg);
    }
  },
  loggingServer: {}
//  loggingServer: {
//    host: 'localhost',
//    port: 9001
//  }
};
