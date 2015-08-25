var confObj = require('../../src/confObjs/twoSimFunc.js')
var Coordinator = require('../../src/controllers/Coordinator.js')
var peerId = '#userId'
var profile = #userProfile
var coordi = new Coordinator(confObj, profile, peerId)
var self = this
window.setTimeout(function () {
  console.log('Launching coordinator now')
  coordi.bootstrap()
}, 5000)

