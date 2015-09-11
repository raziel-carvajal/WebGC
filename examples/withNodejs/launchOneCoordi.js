var Coordinator = require('../../src/controllers/Coordinator')
var confObj = require('../../src/confObjs/twoSimFunc')
var coordi = new Coordinator(confObj, process.argv[2], process.argv[3])
// var profile = process.argv[2]
coordi.bootstrap()
// setTimeout(function () {
//   coordi.updateProfile(profile)
// }, 7000)
