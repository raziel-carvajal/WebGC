var Coordinator = require('../../src/controllers/Coordinator')
var confObj = require('../../src/confObjs/twoSimFunc')
var coordi = new Coordinator(confObj, ['firstP', 'secondP'], process.argv[2])
coordi.bootstrap()
