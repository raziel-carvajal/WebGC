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
      class: 'Cyclon',
      viewSize: 2,
      fanout: 2,
      periodTimeOut: 10000,
      propagationPolicy: { push: true, pull: true }
    },
    vicinity1: { 
      class: 'Vicinity',
      viewSize: 2,
      fanout: 2,
      periodTimeOut: 10000,
      propagationPolicy: { push: true, pull: true },
      selectionPolicy: 'biased', // random OR biased OR agr-biased
      similarityFunction: 'DumbProximityFunc',
      attributes: {
        rpsView: 'cyclon1.view'
      }
    }
  },
  plotter: false,
  loggingServer: {
    host: '131.254.213.42',
    port: 9991
  }
};
