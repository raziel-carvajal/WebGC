/**
* @module src/services*/
module.exports = Bootstrap
var debug = require('debug')('bootstrap')
var inherits = require('inherits')
var its = require('its')
var EventEmitter = require('events').EventEmitter
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
  this._profileTxt = ''
  for (var i = 0; i < profile.length; i++) this._profileTxt += profile[i] + '-'
  this._reconnectionTime = 3000
  this._tries = 0
  this._url = 'http://' + host + ':' + port + '/peerjs'
}
/**
* @memberof Bootstrap
* @method postProfile
* @description Post in the [brokering server]{@link https://github.com/peers/peerjs-server} the
* peer's profile, which is the payload to exchange on each gossip message.*/
Bootstrap.prototype.getPeerToBootstrap = function () {
  debug('Connection success with signaling server, getting first peer to bootstrap')
  var xhr = new XMLHttpRequest()
  var url = this._url + '/' + this._id + '/' + this._profileTxt + '/peerToBoot'
  xhr.open('GET', url, true)
  var self = this
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return
    if (xhr.status !== 200) {
      xhr.onerror()
      return
    }
    var resp = JSON.parse(xhr.responseText)
    debug('Peer to boot is: ' + xhr.responseText)
    its.string(resp.peer)
    its.string(resp.profile)
    // when the peer to bootstrap isn't defined, it means that the local
    // peer is the first peer to contact the server which means that eventually
    // the local peer will be contacted by another peer
    if (resp.peer !== 'undefined') {
      var ar = resp.profile.split('-')
      resp.profile = []
      for (var i = 0; i < ar.length; i++) if (typeof ar[i] !== 'undefined') resp.profile.push(ar[i])
    }
    self.emit('boot', resp)
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
