var fs = require('fs')
var Coordinator = require('../../src/controllers/Coordinator')
var confObj = require('../../src/confObjs/twoSimFunc')
var peerId = process.argv[2]
var profNum = process.argv[3]
var profile = {}
var fileContent, j

for (var i = 0; i < profNum; i++){
  profile['vicinity' + (i + 1)] = []
  fileContent = fs.readFileSync('./preferences' + (i + 1), {encoding: 'utf8'})
  fileContent = fileContent.split('\n')
  for (j = 0; j < fileContent.length; j++) {
    if (fileContent[j] !== '') profile['vicinity' + (i + 1)].push(fileContent[j])
  }
}
var coordi = new Coordinator(confObj, profile, peerId)
coordi.bootstrap()
