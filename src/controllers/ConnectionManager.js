/**
* @module src/controllers
* @author Raziel Carvajal-Gomez raziel.carvajal@gmail.com*/
module.exports = ConnectionManager
var debug = typeof window === 'undefined' ? require('debug')('connnection_manager') : require('debug').log
var Connection = require('../services/Connection')
/**
* @class ConnectionManager
* @description Manage the connections with external peers from all the gossip protocols
* running in the local peer.
* @param maxNumOfCon Maximum number of connections*/
function ConnectionManager (maxNumOfCon) {
  if (!(this instanceof ConnectionManager)) return new ConnectionManager(maxNumOfCon)
  this._cons = {}
  this._maxNumOfCon = maxNumOfCon
}
/**
* @method newConnection
* @description Creates a new connection.
* @param receiver End point of the connection
* @param initiator Says weather the local peer initiates or not the creation of the connection
* @param viaSigSer Says weather the connection bootstraps or not via the signaling server*/
ConnectionManager.prototype.newConnection = function (receiver, initiator, viaSigSer) {
  return {
    connection: new Connection(receiver, initiator, viaSigSer),
    conLimReached: Object.keys(this._cons).length === this._maxNumOfCon
  }
}
/**
* @method get
* @description Gets an instance of one connection.
* @param id Connection ID, which coincides with the peer ID of the connection end point*/
ConnectionManager.prototype.get = function (id) { return this._cons[id] !== 'undefined' ? this._cons[id] : null }
/**
* @method set
* @description Replace the instance of one connection with a new one.
* @param c New instance of one connection*/
ConnectionManager.prototype.set = function (c) {
  if (!this._cons[c._receiver]) this._cons[c._receiver] = c
  else debug('Connection with: ' + c._receiver + ' already exists')
}
/**
* @method get Connections
* @description Gets an array of the current connection IDs.
* @return Array Array of connection IDs*/
ConnectionManager.prototype.getConnections = function () { return Object.keys(this._cons) || [] }
/**
* @method deleteOneCon
* @description Delete one connection.*/
ConnectionManager.prototype.deleteOneCon = function () {
  var keys = Object.keys(this._cons)
  debug('DelOneCon before: ' + JSON.stringify(keys))
  debug('DelOneCon called, connection to remove: ' + keys[0])
  this._cons[keys[0]].closeAndAnnounce()
  delete this._cons[keys[0]]
  debug('DelOneCon after:' + JSON.stringify(Object.keys(this._cons)))
  return keys[0]
}
/**
* @method deleteConnection
* @description Delete one particular connection.
* @param id Connection ID to delete*/
ConnectionManager.prototype.deleteConnection = function (id) {
  debug('DelCon before: ' + JSON.stringify(Object.keys(this._cons)))
  this._cons[id].close()
  delete this._cons[id]
  debug('DelCon after: ' + JSON.stringify(Object.keys(this._cons)))
}
