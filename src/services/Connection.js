module.exports = Connection
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var Peer = require('simple-peer')
var debug
if (typeof window === 'undefined') {
  var wrtc = require('wrtc')
  debug = require('debug')('connection')
} else debug = require('debug').log
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
    'config': { iceServers: [
      {urls:'stun:stun01.sipphone.com'}
//        {urls:'stun:stun.l.google.com:19302'},
//        {urls:'stun:stun1.l.google.com:19302'},



//        {
//            urls: 'turn:192.158.29.39:3478?transport=tcp',
//              credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//                username: '28224511:1379330808'
//        }
//





    ]},
    'wrtc': typeof window === 'undefined' ? wrtc : false
  })
  var self = this
  this._peer.on('connect', function () {
    self._isOpen = true
    debug('Connection with: ' + self._receiver + ' is open')
    for (var i = 0; i < self._msgsQueue.length; i++) self._peer.send(self._msgsQueue[i])
    self._msgsQueue = []
    if (!self._usingSigSer) self.emit('open')
  })
  this._peer.on('signal', function (data) {
    debug('SDP: [' + Object.keys(data) + '] to exchange with: ' + self._receiver)
    self.emit('sdp', data)
  })
  this._peer.on('data', function (data) {
    debug('Message: ' + data.service + ' received from: ' + self._receiver)
    self.emit('msgReception', data)
  })
  this._peer.on('error', function (err) {debug('Connection error with: ' + self._receiver + '. ' + err)})
}

Connection.prototype.send = function (msg) {
  if (!this._isOpen) {
    debug('Connection with peer: ' + this._receiver + "isn't open, enqueueing msg")
    this._msgsQueue.push(msg)
  } else {
    debug('Sending message to: ' + this._receiver)
    this._peer.send(msg)
  }
}

Connection.prototype.closeAndAnnounce = function () {
  this.send({service: 'LEAVE'})
  this._peer.destroy()
}

Connection.prototype.close = function () {
  debug('Connection with: ' + this._receiver + ' is closed')
  this._peer.destroy()
}
