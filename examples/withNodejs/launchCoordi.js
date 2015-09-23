var fs = require('fs')
var XMLHttpRequest = require('xhr2')
var Coordinator = require('../../src/controllers/Coordinator')
var configurationObj = require('./confObj')
function postKeepAlive (peerId) {
  var host = configurationObj.signalingService.host
  var port = configurationObj.signalingService.port
  var url = 'http://' + host + ':' + port + '/keepAlive'
  var xhr = new XMLHttpRequest()
  xhr.open('POST', url, true)
  xhr.setRequestHeader('Content-type', 'text/plain')
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return
    if (xhr.status !== 200) {
      xhr.onerror()
      return
    }
    var res = JSON.parse(xhr.responseText)
    if (res.success) console.log('Keep alive was posted')
    else console.log('Keep alive was not received by the server')
  }
  xhr.onerror = function () { console.log('ERROR: While posting keep alive msg') }
  xhr.send(JSON.stringify({ id: peerId }))
}
var coordi = new Coordinator(configurationObj, process.argv[2], ['undefined'])
coordi.on('msgReception', function(emitter, data){
  console.log('MESSAGE: ' + data + ', RECEIVED FROM: ' + emitter)
})
coordi.bootstrap()
setInterval(function () { postKeepAlive(coordi._id) }, 4000)
