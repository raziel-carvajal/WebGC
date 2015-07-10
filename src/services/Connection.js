module.exports = Connection

var inherits = require('inherits')
var debug = require('debug')('connection')
var EventEmitter = require('events').EventEmitter
var Peer = require('simple-peer')

if (typeof window === 'undefined') var wrtc = require('wrtc')
inherits(Connection, EventEmitter)

function Connection (receiver, initiator, usingSigSer) {
  if (!(this instanceof Connection)) return new Connection(receiver, initiator, usingSigSer)
  EventEmitter.call(this)
  this._receiver = receiver
  this._initiator = initiator
  this._usingSigSer = usingSigSer
  this._isOpen = false
  this._msgsQueue = []
  this._peer = new Peer({
    'initiator': initiator,
    'wrtc': typeof window === 'undefined' ? wrtc : false
  })
  var self = this
  this._peer.on('connect', function () {
    self._isOpen = true
    debug('Connection with: ' + self._receiver + ' is open')
    for (var i = 0; i < self._msgsQueue.length; i++) self._peer.send(self._msgsQueue[i])
    self._msgsQueue = []
    if (self._initiator) self.emit('open')
  })
  this._peer.on('signal', function (data) {
    debug('SDP: [' + Object.keys(data) + '] to exchange with: ' + self._receiver)
    self.emit('sdp', data)
  })
  this._peer.on('data', function (data) {self.emit('msgReception', data, self._receiver)})
  this._peer.on('error', function (err) {debug('Connection error with: ' + self._receiver + '. ' + err)})
}

Connection.prototype.send = function (msg) {
  if (!this._isOpen) {
    debug('Connection with peer: ' + this._receiver + "isn't open, enqueueing msg")
    this._msgsQueue.push(msg)
  } else {
    this._peer.send(msg)
  }
}
