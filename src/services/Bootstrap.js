/**
* @module src/services*/
module.exports = Bootstrap

var debug = require('debug')('bootstrap')
var inherits = require('inherits')
var its = require('its')
var EventEmitter = require('events').EventEmitter
var PeerJSProtocol = require('../utils/PeerjsProtocol')

if (typeof window === 'undefined') var XMLHttpRequest = require('xhr2')
var TIMES_TO_RECONECT = 3

inherits(Bootstrap, EventEmitter)
/**
* @class Bootstrap
* @description For being able to join an overlay peers must receive at least one reference of
* another peer (already in the overlay) to communicate with, most of the methods in this class
* communicate with one server which will provide a list of peers to bootstrap the exchange of gossip
* messages. The bootstrap procedure works as follows: first of all, peers post its local profile
* that is the payload contained in every gossip message then, peers request the reference of
* another peer to perform a connection with it via the
* [brokering server]{@link https://github.com/peers/peerjs-server}, finally, peers request a list
* of peer references which will initialize every view of the gossip protocols (see attribute view
* of [GossipProtocol]{@link module:src/superObjs#GossipProtocol}).
* @param coordi Reference to the [Coordinator]{@link module:src/controllers#Coordinator}
* @author Raziel Carvajal-Gomez <raziel.carvajal@gmail.com>*/
function Bootstrap (peerId, host, port, profile) {
  if (!(this instanceof Bootstrap)) return new Bootstrap(peerId, host, port, profile)
  its.string(peerId)
  its.string(host)
  its.number(port)
  EventEmitter.call(this)
  this._id = peerId
  this._serverOpts = {'host': host, 'port': port}
  this._profile = profile
  this._reconnectionTime = 3000
  this._tries = 0
  this._url = 'http://' + host + ':' + port + '/peerjs'
  this._signalingService = new PeerJSProtocol(peerId, host, port)
  this._initEvents()
}

Bootstrap.prototype.resetSignalingService = function (peerId) {
  this._signalingService.destroy()
  this._signalingService = new PeerJSProtocol(peerId, this._serverOpts.host, this._serverOpts.port)
  this._initEvents()
}

Bootstrap.prototype._initEvents = function () {
  var self = this
  this._signalingService.on('open', function () { self._getPeerToBootstrap() })
  this._signalingService.on('idTaken', function () {
    debug('idTaken')
    // TODO Coordinator must implement this event if WebGC is open to the public where
    // the peerID must be generated in a random way (via the 'hat' library for instance)
    // aviding that two peers have the same identifier
    // self.emit('resetPeerId')
  })
  this._signalingService.on('abort', function () { self.emit('abort') })
  this._signalingService.on('getFirstPeer', function () {
    debug('getFitstPeer')
    // TODO Again these two method must be implemented if WebGC is open to the public
    // self.emit('removeAllConnections')
    // self._getPeerToBootstrap()
  })
}
/**
* @memberof Bootstrap
* @method postProfile
* @description Post in the [brokering server]{@link https://github.com/peers/peerjs-server} the
* peer's profile, which is the payload to exchange on each gossip message.*/
Bootstrap.prototype._getPeerToBootstrap = function () {
  debug('Connection success with signaling server, getting first peer to bootstrap')
  var xhr = new XMLHttpRequest()
  var url = this._url + '/' + this._id + '/profi' + '/peerToBoot'
  xhr.open('GET', url, true)
  var self = this
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return
    if (xhr.status !== 200) {
      xhr.onerror()
      return
    }
    debug('Peer to boot is: ' + xhr.responseText)
    var peerToBootstrap = xhr.responseText
    its.string(peerToBootstrap)
    // when the peer to bootstrap isn't defined, it means that the local
    // peer is the first peer to contact the server which means that eventually
    // the local peer will be contacted by another peer
    if (peerToBootstrap !== 'undefined') {
      self.emit('boot', peerToBootstrap)
    } else {
      debug('I am the first peer in the overlay, eventually other peer will contact me')
    }
  }
  xhr.onerror = function () {
    self._tries++
    debug('Error while getting first peer to bootstrap, scheduling another request')
    if (self._tries <= TIMES_TO_RECONECT) {
      setTimeout(self._getPeerToBootstrap, 3000)
    } else {
      debug('Too many erros during interaction with server, aborting')
      self.emit('abort')
    }
  }
  xhr.send(null)
}
