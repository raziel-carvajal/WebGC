/**
* @module lib/conf_objs
* @const configurationObj
* @type {Object}
* @description
* @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr>*/
var configurationObj = {
  peerJsOpts: {
    //host: '131.254.213.42',
    host: '127.0.0.1',
    port: 9990,//port of the PeerServer
    debug: 1,//Level of the local logging (logs that appears in the console part of each browser)
    logFunction: function(){
      var msg = Array.prototype.slice.call(arguments).join(' ');
      console.log(msg);
    }
  },
  gossipAlgos: {
    cyclon1: {
      class: 'Cyclon',
      viewSize: 4,
      fanout: 4,
      gossipPeriod: 10000,
      propagationPolicy: { push: true, pull: true }
    },
    vicinity1: { 
      class: 'Vicinity',
      viewSize: 4,
      fanout: 4,
      gossipPeriod: 10000,
      propagationPolicy: { push: true, pull: true },
      selectionPolicy: 'biased', // random OR biased OR agr-biased
      //implementation of the cosine similarity
      similarityFunction: function(a, b, log){
        var prSum = 0, aSqrtSum = 0, bSqrtSum = 0;
        var minLength = Math.min(a.length, b.length);
        for(var i = 0; i < minLength; i++){
          prSum += a[i] * b[i];
          aSqrtSum += a[i] * a[i];
          bSqrtSum += b[i] * b[i];
        }
        var r = prSum / (Math.sqrt(aSqrtSum) * Math.sqrt(bSqrtSum));
        log.info('CosineSim: ' + r + ', with vectors: ' + JSON.stringify({'a': a, 'b': b}));
        return r;
      },
      dependencies:[
        { algoId: 'cyclon1', algoAttribute: 'view' }
      ]
    }
  },
  usingWebWorkers: true,
  logOpts: {
    host: '127.0.0.1',
    //host: '131.254.213.42',
    port: 9991
  }
};
