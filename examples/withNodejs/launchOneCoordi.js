var Coordinator = require('../../src/controllers/Coordinator')
var confObj = require('./confObj')
var peerId = process.argv[2]
var peerNum = peerId.split('_')[1]
var coordi = new Coordinator(confObj, peerId, ['undefined'])
coordi.bootstrap()
setTimeout(function () {
  if (peerNum < 6) coordi.updateProfile(['uno','dos'])
}, 30000)
