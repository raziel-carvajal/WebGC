module.exports = Socket

var debug = require('debug')('socket')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var OPTS = {
  urlPrefix: 'wss://',
  randomToken: function () { return Math.random().toString(36).substr(2) },
  key: 'webgc'
}
if (typeof window === 'undefined') var WebSocket = require('websocket').w3cwebsocket
inherits(Socket, EventEmitter)

function Socket (peerId, host, port) {
  if (!(this instanceof Socket)) return Socket(peerId, host, port)
  EventEmitter.call(this)
  this.disconnected = false
  this._url = OPTS.urlPrefix + host + ':' + port + '/peerjs?key=' + OPTS.key +
    '&id=' + peerId + '&=token' + OPTS.randomToken()
  this._socket = new WebSocket(this._url)
  var self = this
  this._socket.onmessage = function (evnt) {
    try {
      var msg = JSON.parse(evnt.data)
    } catch (e) {
      debug("msg from server isn't recognized: " + evnt.data)
      return
    }
    self.emit('message', msg)
  }
  this._socket.onclose = function () {
    debug('Socket is closed')
    self.close()
  }
  this._socket.onopen = function () {
    debug('Socket is open')
  }
  this._socket.onerror = function (e) {
    debug('Error in socket connection: ' + e)
  }
}

Socket.prototype.send = function (msg) {
  if (this.disconnected) return
  if (!msg){
    debug('Empty message to send')
    return
  }
  if (!this.disconnected) {
    var data = JSON.stringify(msg)
    this._socket.send(data)
  } else debug("Msg wasn't sent cause socket is desconnected")
}

Socket.prototype.close = function () {
  if (!this.disconnected) {
    this.disconnected = true
    this._socket.close()
  }
}