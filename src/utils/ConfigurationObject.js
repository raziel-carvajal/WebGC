/**
* @module src/confObjs
* @alias module:src/confObjs.configurationObj*/
/**
* @const configurationObj
* @description This object serves as the input that any application with WebGC needs. Basically,
* the settings for each gossip-based protocol are written down here as well as other settings for
* general propose. The configuration object is formed with the next properties:
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
* @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr>*/
var configurationObj = {
  signalingService: {
    host: 'localhost',
    port: 9990
  },
  gossipAlgos: {
    cyclon1: {
      class: 'Cyclon',
      viewSize: 8,
      fanout: 4,
      gossipPeriod: 8000,
      propagationPolicy: { push: true, pull: true }
    },
    vicinity1: {
      class: 'Vicinity',
      viewSize: 8,
      fanout: 4,
      gossipPeriod: 8000,
      propagationPolicy: { push: true, pull: true },
      selectionPolicy: 'biased', // random OR biased OR agr-biased
      // implementation of the cosine similarity
      // it is considered that: a.length = b.length
      similarityFunction: function (a, b) {
        function stringToNumber (s) {
          var num = 0
          for (var i = 0; i < s.length; i++) num += s.charCodeAt(i)
          return num
        }
        var maxLength = Math.max(a.length, b.length)
        var a1 = []
        var b1 = []
        var sumAsqr = 0
        var sumBsqr = 0
        var sumProd = 0
        for (var i = 0; i < maxLength; i++) {
          if (i < a.length && i < b.length) {
            a1[i] = stringToNumber(a[i])
            b1[i] = stringToNumber(b[i])
          } else if (i < a.length){
            a1[i] = stringToNumber(a[i])
            b1[i] = 1
          } else {
            a1[i] = 1
            b1[i] = stringToNumber(b[i])
          }
          sumAsqr += a1[i] * a1[i]
          sumBsqr += b1[i] * b1[i]
          sumProd += a1[i] * b1[i]
        }
        if (sumAsqr === 0 || sumBsqr === 0) return sumProd
        return sumProd / (Math.sqrt(sumAsqr) * Math.sqrt(sumBsqr))
      },
      dependencies: [
        { algoId: 'cyclon1', algoAttribute: 'view' }
      ]
    }
  },
  userImplementations: [],
  statsOpts: {
    activated: false,
    feedbackPeriod: 20000
  },
  usingSs: true
}
module.exports = configurationObj
