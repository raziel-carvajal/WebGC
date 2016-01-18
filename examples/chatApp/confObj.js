var configurationObj = {
  signalingService: {
    //host: 'localhost',
    //host: '131.254.213.43',
    port: 9990
  },
  gossipAlgos: {
    cyclon1: {
      class: 'Cyclon',
      viewSize: 3,
      fanout: 2,
      gossipPeriod: 5000,
      propagationPolicy: { push: true, pull: true }
    },
    vicinity1: {
      class: 'Vicinity',
      viewSize: 3,
      fanout: 3,
      gossipPeriod: 10000,
      propagationPolicy: { push: true, pull: true },
      selectionPolicy: 'biased', // random OR biased OR agr-biased
      // implementation of the cosine similarity to compare two arrays
      // of strings. Every string is mapped to the sum of the unicode
      // value of each character. If the size of the vectors isn't the
      // same, the defficit is filled with zeros
      similarityFunction: function (a, b) {
        var maxLength = Math.max(a.length, b.length)
        console.log('SIMILA: ' + JSON.stringify(a) + '  ' + JSON.stringify(b))
        var resu = 0
        for (var i = 0; i < maxLength; i++) {
          if (typeof a[i] != undefined && typeof b[i] != undefined) {
            if (a[i] == b[i]) resu += 1
            else resu += 0.4
          } else resu += 0.1
        }
        console.log('SIMILA RESU: ' + resu)
        return resu
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
