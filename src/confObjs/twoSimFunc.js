/**
* @module src/confObjs*/

/**
* @alias module:src/confObjs.configurationObj*/

/**
* @const configurationObj
* @description This object serves as the input that any application with WebGC needs. Basically,
* the settings for each gossip-based protocol are written down here as well as other settings for 
* general propose. The configuration object is formed with the next properties:
* 
* i) peerJsOpts: PeerJS settings, click [here]{@link http://peerjs.com/} for more information
* ii) gossipAlgos: the properties of this object are unique identifiers for each gossip protocol,
*   every property points to another object which contains particular settings of each protocol
*   like its class name (name of the class that implements the protocol), number of items in 
*   its view, number of peers (fanout) to exchange messages with, seconds of each gossip
*   cycle, etc.
* iii) logOpts: given that it is quite difficult to record logs of clients behind web browsers,
*   this object contains information about one server that records every log of WebGC. When
*   the log server is deactivated every log appears in the console of the browser
* iv) usingSs: WebGC is extended with a lookup service (see
*   [LookupService]{@link module:src/services#LookupService} for more details) to take rid of
*   the [brokering server]{@link https://github.com/peers/peerjs-server} in WebRTC, 
*   this server allows to create connections among web browsers. 
*   If this property is set to "true" a new connection among two peers, and considering that these
*   peers contains at least one connection with others, will be performed using the already existing
*   connections on the overlay; otherwise, every new connection among two peers will need a first
*   communication with the brokering server (FYI the coordinates of this server are defined at the
*   "peerJsOpts" property)
* v) lookupMulticast: when a lookup message M is received by one peer, M is retransmitted to
*   "lookupMulticast" peer's neighbours
* vi) lookupMsgSTL: for avoiding infinite forwards of lookup messages, this property determines
*   how many times lookup messages are retransmitted; an optimal value of this parameter depends on
*   the overlay diameter
* vii) bootstrapTimeout: number of milliseconds to wait for each peer to bootstrap
* 
* @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr>*/
var configurationObj = {
  peerJsOpts: {
    host: '131.254.213.43',
    //host: '127.0.0.1',
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
      viewSize: 4,
      fanout: 3,
      gossipPeriod: 10000,
      propagationPolicy: { push: true, pull: true }
    },
    vicinity1: {
      class: 'Vicinity',
      viewSize: 4,
      fanout: 3,
      gossipPeriod: 25000,
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
        //log.info('CosineSim: ' + r + ', with vectors: ' + JSON.stringify({'a': a, 'b': b}));
        return r;
      },
      dependencies:[
        { algoId: 'cyclon1', algoAttribute: 'view' }
      ]
    }
  },
  logOpts: {
    //host: '127.0.0.1',
    host: '131.254.213.43',
    port: 9991,
    activated: true,
    feedbackPeriod: 20000
  },
  usingSs: true,
  lookupMulticast: 2,
  lookupMsgSTL: 10,
  bootstrapTimeout: 5000
};
