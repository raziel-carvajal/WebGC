var confObj = require('./confObj.js')
var Coordinator = require('../../src/controllers/Coordinator.js')
var peerId = '#userId'
var profile = #userProfile
var coordi = new Coordinator(confObj, peerId, profile)
window['coordinator'] = coordi
//var self = this
//window.setTimeout(function () {
//  console.log('Launching coordinator now')
coordi.bootstrap()
//}, 5000)

