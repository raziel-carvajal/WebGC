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
