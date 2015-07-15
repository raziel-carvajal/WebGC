module.exports = ConnectionManager

var debug = require('debug')('gossipCoManager')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var Connection = require('../services/Connection')

inherits(ConnectionManager, EventEmitter)

function ConnectionManager (maxNumOfCon) {
  if (!(this instanceof ConnectionManager)) return new ConnectionManager(maxNumOfCon)
  EventEmitter.call(this)
  this._cons = {}
  this._maxNumOfCon = maxNumOfCon
}

ConnectionManager.prototype.newConnection = function (receiver, initiator, viaSigSer, profile) {
  return new Connection(receiver, initiator, viaSigSer, profile)
}

ConnectionManager.prototype.get = function (id) { return Object.keys(this._cons).indexOf(id, 0) }

ConnectionManager.prototype.set = function (c) {
  if (Object.keys(this._cons).length === this._maxNumOfCon) return -1
  else if (!this._cons[c._receiver]) this._cons[c._receiver] = c
  else debug('Connection with: ' + c._receiver + ' already exists')
  return 0
}
