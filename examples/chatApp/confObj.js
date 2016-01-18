var configurationObj = {
  signalingService: {
    //host: 'localhost',
    host: '131.254.213.43',
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
        var bCpy = [], i, there = 0, notThere = 0, indx
        for (i = 0; i < b.length; i++) bCpy.push(b[i])
        for (i = 0; i < a.length; i++) {
          indx = bCpy.indexOf(a[i], 0)
          if (indx != -1) {
            there++
            bCpy[indx] = undefined
          } else notThere++
        }
        for (i = 0; i < bCpy.length; i++) {
          if (typeof bCpy[i] != 'undefined') notThere++
        }
        console.log('SIMILA: ' + JSON.stringify(a) + '  ' + JSON.stringify(b))
        console.log('EVALU: t:' + there + ' nT:' + notThere)
        var resu = there * (1.0) + notThere * (-0.3)
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
