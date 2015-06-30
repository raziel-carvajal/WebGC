module.exports = Socket

var debug = require('debug')('socket')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter

inherits(Socket, EventEmitter)

var OPTS = {
  urlPrefix: 'wss://'
}

function Socket () {
  
  EventEmitter.call(this)
  this.disconnected = false

}

Socket.prototype.initialize = function () {}
