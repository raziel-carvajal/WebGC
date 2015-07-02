module.exports = PeerJSProtocol

var debug = require('debug')('peerjs-protocol')
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
      debug('Connection with signaling server is done')
      this.emit('open')
      break
    case 'ERROR':
      debug('Error msg from server: ' + payload.msg)
      break
    case 'ID_TAKEN':
      debug('Chosing another PeerID')
      this.emit('idTaken')
      break
    case 'INVALID_KEY':
      debug("Key for WebGC isn't valid, aborting")
      this.emit('abort')
      break
    case 'LEAVE':
      // TODO check if this message could be useful with the use of simple-peer.
      // Normally, this LEAVE announcement must be performed in a DataChannel
      // between two peers
      debug('PeerJS.LEAVE msg is received, why?')
      break
    case 'EXPIRE':
      // PeerJS: The offer sent to a peer has expired without response.
      debug('Probably peer to bootstrap is down, getting another one')
      this.emit('getFirstPeer')
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

PeerJSProtocol.prototype.destroy = function () { this.socket.close() }
