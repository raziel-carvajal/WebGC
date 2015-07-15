module.exports = ConnectionManager

var debug = require('debug')('gossipCoManager')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var Connection = require('../services/Connection')

inherits(ConnectionManager, EventEmitter)

function ConnectionManager (gossipAlgos) {
  if (!(this instanceof ConnectionManager)) return new ConnectionManager(gossipAlgos)
  EventEmitter.call(this)
  this._cons = {}
  for (var i = 0; i < gossipAlgos.length; i++) this._initView(gossipAlgos[i])
}

ConnectionManager.prototype._initView = function (algoId) {
  if (this._cons[algoId]) return
  this._cons[algoId] = {}
}

ConnectionManager.prototype.updView = function (algoId, newView) {
  if (!this._cons[algoId]) {
    debug("view couldn't be updated because " + algoId + " isn't initialized")
    return
  }
  var i
  var oldView = this._cons[algoId]
  // speed up this case
  if (oldView.length === 0) {
    for (i = 0; i < newView.length; i++) this.emit('connect', newView[i], oldView)
    return
  }
  var keys = Object.keys(oldView)
  for (i = 0; i < keys.length; i++) {
    // keys[i] IN newView ? for arrays IN doesn't work as expected
    if (newView.indexOf(keys[i], 0) >= 0) {
      newView.splice(i, 1)
    } else {
      this.emit('destroy', oldView[keys[i]], keys[i], oldView)
    }
  }
  for (i = 0; i < newView.length; i++) this.emit('connect', newView[i], oldView)
}

ConnectionManager.prototype.newConnection = function (receiver, initiator, viaSigSer, profile) {
  return new Connection(receiver, initiator, viaSigSer, profile)
}

ConnectionManager.prototype.get = function (id) {
  var keys = Object.keys(this._cons)
  for (var i = 0; i < keys.length; i++) {
    if (this._cons[keys[i]][id] !== 'undefined') return this._cons[keys[i]][id]
  }
}

ConnectionManager.prototype.getFrom = function (algoId, id) {
  if (this._cons[algoId] && this._cons[algoId][id]) return this._cons[algoId][id]
  debug('Peer id: ' + id + ' from view: ' + algoId + ' does not exist')
}

ConnectionManager.prototype.setToAll = function (c) {
  var keys = Object.keys(this._cons)
  for (var i = 0; i < keys.length; i++) {
    if (!this._cons[keys[i]][c._receiver]) this._cons[keys[i]][c._receiver] = c
  }
}

ConnectionManager.prototype.getCurrentView = function (algoId) {
  var connection
  var view = []
  var keys = Object.keys(this._cons[algoId])
  for (var i = 0; i < keys.length; i++) {
    connection = this._cons[algoId][keys[i]]
    view.push({ id: keys[i] , profile: connection._rcvProfile })
  }
  return view
}
