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
      gossipPeriod: 5000,
      propagationPolicy: { push: true, pull: true }
    },
    vicinity1: {
      class: 'Vicinity',
      viewSize: 4,
      fanout: 4,
      gossipPeriod: 5000,
      propagationPolicy: { push: true, pull: true },
      selectionPolicy: 'agr-biased', // random OR biased OR agr-biased
      //implementation of the cosine similarity
      //it is considered that: a.length = b.length
      similarityFunction: function(a, b, log){
        var a1 = [], b1 = [], i, tmpA, tmpB, sumA = 0, sumB = 0;
        for(i = 0; i < a.length; i++){
          tmpA = a[i] !== 'undefined' ? 1 : 0;
          tmpB = b[i] !== 'undefined' ? 1 : 0;
          a1.push(tmpA);
          b1.push(tmpB);
          sumA += tmpA;
          sumB += tmpB;
        }
        if(sumA === 0){ for(i = 0; i < a.length; i++){ a1[i] = 1; } }
        if(sumB === 0){ for(i = 0; i < a.length; i++){ b1[i] = 1; } }
        var prSum = 0, aSqrtSum = 0, bSqrtSum = 0;
        for(i = 0; i < a1.length; i++){
          prSum += a1[i] * b1[i];
          aSqrtSum += a1[i] * a1[i];
          bSqrtSum += b1[i] * b1[i];
        }
        var r = prSum / (Math.sqrt(aSqrtSum) * Math.sqrt(bSqrtSum));
        log.info('CosineSim: ' + r + ', with vectors: ' + JSON.stringify({'a': a, 'b': b}));
        return r;
      },
      dependencies:[
        { algoId: 'cyclon1', algoAttribute: 'view' }
      ]
    },
    vicinity2: { 
      class: 'Vicinity',
      viewSize: 4,
      fanout: 4,
      gossipPeriod: 5000,
      propagationPolicy: { push: true, pull: true },
      selectionPolicy: 'agr-biased', // random OR biased OR agr-biased
      //implementation of the cosine similarity
      //it is considered that len(a) = len(b)
      similarityFunction: function(a, b, log){
        var a1 = [], b1 = [], i, tmpA, tmpB, sumA = 0, sumB = 0;
        for(i = 0; i < a.length; i++){
          tmpA = a[i] !== 'undefined' ? 1 : 0;
          tmpB = b[i] !== 'undefined' ? 1 : 0;
          a1.push(tmpA);
          b1.push(tmpB);
          sumA += tmpA;
          sumB += tmpB;
        }
        if(sumA === 0){ for(i = 0; i < a.length; i++){ a1[i] = 1; } }
        if(sumB === 0){ for(i = 0; i < a.length; i++){ b1[i] = 1; } }
        var prSum = 0, aSqrtSum = 0, bSqrtSum = 0;
        for(i = 0; i < a1.length; i++){
          prSum += a1[i] * b1[i];
          aSqrtSum += a1[i] * a1[i];
          bSqrtSum += b1[i] * b1[i];
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
  logOpts: {
    host: '127.0.0.1',
    //host: '131.254.213.42',
    port: 9991,
    activated: false,
    feedbackPeriod: 15000
  }
};
