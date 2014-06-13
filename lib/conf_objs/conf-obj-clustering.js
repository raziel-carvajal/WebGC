/**
* @module lib/conf_objs
* @const configurationObj
* @type {Object}
* @desc This is an example of a configuration object. Basically, there are two parts in this object: 
* the first part contains properties for the Peer class of PeerJS in the property peerServer and the 
* second part contains an array of gossip protocols in the property protocols; the protocols in the 
* array are going to build clusters with the peers that uses this configuration object.
* @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr>*/
var configurationObj = {
  peerId: document.getElementById('peerId').innerHTML,
  peerJsOpts: {
    host: 'localhost',
    port: 9000,
    debug: 3,
    logFunction: function(){
      var msg = Array.prototype.slice.call(arguments).join(' ');
      console.log(msg);
    }
  },
  gossipAlgos: {
    cyclon1: {
      class: 'Cyclon',
      data: parseInt(document.getElementById('data').innerHTML),
      viewSize: 10,
      fanout: 5,
      periodTimeOut: 10000,
      propagationPolicy: { push: true, pull: true } 
    },
    vicinity1: { 
      class: 'Vicinity',
      data: parseInt(document.getElementById('data').innerHTML),
      viewSize: 10,
      fanout: 5,
      periodTimeOut: 10000,
      propagationPolicy: { push: true, pull: true },
      selectionPolicy: 'biased', // random OR biased OR agr-biased
      similarityFunction: 'DumbProximityFunc',
      attributes: {
        rpsView: 'cyclon1'
      }
    }
  }
//  loggingServer: {
//    host: 'localhost',
//    port: 9001
//  }
};
