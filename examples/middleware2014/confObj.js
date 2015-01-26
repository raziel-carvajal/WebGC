/**
* @module lib/conf_objs
* @const configurationObj
* @type {Object}
* @desc This is an example of a configuration object. Basically, there are two parts in this object: 
* the first part contains properties for the Peer class of PeerJS in the property peerServer and the 
* second part contains an array of gossip protocols in the property protocols; the protocols in the 
* array are going to build clusters with the peers that uses this configuration object. Just for 
* logging propouses the property plotter has the information of a NodeJS server that collects 
* the logs of every gossip peer.
* @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr>*/
var configurationObj = {
  peerJsOpts: {
    host: '131.254.213.42',
    port: 9990,//port of the PeerServer
    debug: 3,//Level of the local logging (logs that appears in the console part of each browser)
    logFunction: function(){
      var msg = Array.prototype.slice.call(arguments).join(' ');
      console.log(msg);
    }
  },
  gossipAlgos: {
    cyclon1: {
      class: 'SamplingService',
      viewSize: 4,
      fanout: 4,
      periodTimeOut: 10000,
      propagationPolicy: { push: true, pull: true },
      selectionPolicy: 'oldest',
      H: 2,
      S: 0
    },
//    cyclon1: {
//      class: 'Cyclon',
//      viewSize: 4,
//      fanout: 3,
//      periodTimeOut: 10000,
//      propagationPolicy: { push: true, pull: true }
//    },
    vicinity1: { 
      class: 'Vicinity',
      viewSize: 4,
      fanout: 4,
      periodTimeOut: 10000,
      propagationPolicy: { push: true, pull: true },
      selectionPolicy: 'agr-biased', // random OR biased OR agr-biased
      attributes: {
        rpsView: 'cyclon1.view'
      },
      similarityFunctions: { dumbFunc: 'DumbProximityFunc'}
    }
  },
  plotter: false,
  loggingServer: {
    host: '131.254.213.42',
    port: 9991
  }
};
