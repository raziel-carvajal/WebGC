module.exports = Connection
var inherits = require('inherits')
var debug = require('debug')('connection')
var EventEmitter = require('events').EventEmitter
var Peer = require('simple-peer')
if (typeof window === 'undefined') var wrtc = require('wrtc')
inherits(Connection, EventEmitter)

function Connection (initiator, receiver, usingSigSer) {
  if (typeof this !== Connection) return new Connection(initiator, receiver, usingSigSer)
  EventEmitter.call(this)
  this._receiver = receiver
  this._usingSigSer = usingSigSer
  this._isOpen = false
  this._msgsQueue = []
  this._peer = new Peer({ 'initiator': initiator, 'wrtc': wrtc })
  var self = this
  this._peer.on('error', function (err) {})
  this._peer.on('signal', function (data) {
    if (self._usingSigSer) {
      self.emit('sdpViaSigSer', data, self._receiver)
    } else {
      self.emit('sdpViaDatCon', data, self._receiver)
    }
  });
  this._peer.on('connect', function () {
    self._isOpen = true
    debug('Connection with peer: ' + self._receiver + ' is open')
    for (var i = 0; i < self._msgsQueue.length; i++) self._peer.send(self._msgsQueue[i])
    self._msgsQueue = []
  });
  this._peer.on('data', function (data) {
    self.emit('msgReception', data, self._receiver)
  });
}

Connection.prototype.send = function (msg) {
  if (!this._isOpen) {
    debug('Connection with peer: ' + this._receiver + "isn't open, enqueueing msg")
    this._msgsQueue.push(msg)
  } else {
    this._peer.send(msg)
  }
}
