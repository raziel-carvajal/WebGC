module.exports = PeerJSProtocol

var debug = require('debug')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter

inherits(PeerJSProtocol, EventEmitter)

function PeerJSProtocol (peerId, host, port) {
  if (!(this instanceof PeerJSProtocol)) return new PeerJSProtocol(peerId, host, port)
  EventEmitter.call(this)
  this._open = false
  this._peer = peer
  this.socket = new Socket(peerId, host, port)
  var self = this
  this.socket.on('message', function (msg) { self._handleMessage(msg) })
  this.socket.on('close', function () { self.socket.close() })
}

PeerJSProtocol.prototype._handleMessage = function (msg) {
  var type = msg.type
  var payload = msg.payload
  var peer = msg.src
  switch (type) {
    case 'OPEN':
      this._open = true
      this.emit('open')
      break
    case 'ERROR':
      break
    case 'ID_TAKEN':
      break
    case 'INVALID_KEY':
      break
    case 'LEAVE':
      break
    case 'EXPIRE':
      break
    case 'OFFER':
      break
    case 'ANSWER':
      break
    case 'CANDIDATE':
      break
    default:
      debug("Message isn't in the PeerJS protocol")
      break
  }
}
