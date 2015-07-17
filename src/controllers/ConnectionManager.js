module.exports = ConnectionManager
var debug = require('debug')('connection-manager')
var Connection = require('../services/Connection')

function ConnectionManager (maxNumOfCon) {
  if (!(this instanceof ConnectionManager)) return new ConnectionManager(maxNumOfCon)
  this._cons = {}
  this._maxNumOfCon = maxNumOfCon
}

ConnectionManager.prototype.newConnection = function (receiver, initiator, viaSigSer) {
  return {
    connection: new Connection(receiver, initiator, viaSigSer),
    conLimReached: Object.keys(this._cons).length === this._maxNumOfCon
  }
}

ConnectionManager.prototype.get = function (id) { return this._cons[id] }

ConnectionManager.prototype.set = function (c) {
  if (!this._cons[c._receiver]) this._cons[c._receiver] = c
  else debug('Connection with: ' + c._receiver + ' already exists')
  return 0
}

ConnectionManager.prototype.getConnections = function () { return Object.keys(this._cons) }

ConnectionManager.prototype.deleteOneCon = function () {
  var keys = Object.keys(this._cons)
  debug('DelOneCon before: ' + JSON.stringify(keys))
  var toDel = Math.floor(Math.random() * keys.length)
  debug('DelOneCon called, connection to remove: ' + keys[toDel])
  this._cons[keys[toDel]].closeAndAnnounce()
  delete this._cons[keys[toDel]]
  debug('DelOneCon after:' + JSON.stringify(Object.keys(this._cons)))
  return keys[toDel]
}

ConnectionManager.prototype.deleteConnection = function (id) {
  debug('DelCon before: ' + JSON.stringify(Object.keys(this._cons)))
  this._cons[id].close()
  delete this._cons[id]
  debug('DelCon after: ' + JSON.stringify(Object.keys(this._cons)))
}
