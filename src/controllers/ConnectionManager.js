module.exports = ConnectionManager
var debug = typeof window === 'undefined' ? require('debug')('connnection_manager') : require('debug').log
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

ConnectionManager.prototype.get = function (id) { return this._cons[id] !== 'undefined' ? this._cons[id] : null }

ConnectionManager.prototype.set = function (c) {
  if (!this._cons[c._receiver]) this._cons[c._receiver] = c
  else debug('Connection with: ' + c._receiver + ' already exists')
}

ConnectionManager.prototype.getConnections = function () { return Object.keys(this._cons) || [] }

ConnectionManager.prototype.deleteOneCon = function () {
  var keys = Object.keys(this._cons)
  debug('DelOneCon before: ' + JSON.stringify(keys))
  debug('DelOneCon called, connection to remove: ' + keys[0])
  this._cons[keys[0]].closeAndAnnounce()
  delete this._cons[keys[0]]
  debug('DelOneCon after:' + JSON.stringify(Object.keys(this._cons)))
  return keys[0]
}

ConnectionManager.prototype.deleteConnection = function (id) {
  debug('DelCon before: ' + JSON.stringify(Object.keys(this._cons)))
  this._cons[id].close()
  delete this._cons[id]
  debug('DelCon after: ' + JSON.stringify(Object.keys(this._cons)))
}
