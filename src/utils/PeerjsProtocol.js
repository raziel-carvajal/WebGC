module.exports = PeerJSProtocol
var debug
if (typeof window === 'undefined') debug = require('debug')('peerJSproto')
else debug = require('debug').log
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var Socket = require('./Socket')
inherits(PeerJSProtocol, EventEmitter)

function PeerJSProtocol (peerId, host, port) {
  if (!(this instanceof PeerJSProtocol)) return new PeerJSProtocol(peerId, host, port)
  EventEmitter.call(this)
  this._id = peerId
  this._open = false
  this.socket = new Socket(peerId, host, port)
  var self = this
  this.socket.on('message', function (msg) { self._handleMessage(msg) })
  this.socket.on('close', function () { self.socket.close() })
}

PeerJSProtocol.prototype._handleMessage = function (msg) {
  switch (msg.type) {
    case 'OPEN':
      this._open = true
      debug('Connection with signaling server is done')
      this.emit('open')
      break
    case 'ERROR':
      debug('Error msg from server: ?')
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
      debug('Offer received from: ' + msg.src)
      this.emit('offer', msg.src, msg.payload)
      break
    case 'ANSWER':
      debug('Answer received from: ' + msg.src)
      this.emit('answer', msg.src, msg.payload)
      break
    case 'CANDIDATE':
      debug('Candidate received from: ' + msg.src)
      this.emit('candidate', msg.src, msg.payload)
      break
    default:
      debug("Message isn't in the PeerJS protocol")
      break
  }
}

PeerJSProtocol.prototype.destroy = function () { this.socket.close() }

PeerJSProtocol.prototype.sendSDP = function (sdp, receiver) {
  var type = typeof sdp.type !== 'undefined' ? sdp.type.toUpperCase() : 'CANDIDATE'
  if (this._open) this.socket.send({'type': type, dst: receiver, payload: sdp})
  else debug('Socket is closed. SDP: ' + type + 'will not be transmitted to: ' + receiver)
}
