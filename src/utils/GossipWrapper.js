module.exports = GossipWrapper
var its = require('its')
var debug = typeof window === 'undefined' ? require('debug')('gossip-wrapper') : require('debug').log

function GossipWrapper (coordinator, algoId, id) {
  if (!(this instanceof GossipWrapper)) return new GossipWrapper(coordinator, algoId, id)
  this._coordi = coordinator
  this._algoId = algoId
  this._id = id
}
GossipWrapper.prototype.setNeighbourhoodSize = function (n) {
  its.number(n, 'Neighbourhood new size is not a number')
  its.range(n >= 1, 'Neighbourhood new size must be at least bigger then one')
  var fanout = this._coordi.gossipAlgos[this._algoId].fanout
  its.range(n > fanout, 'Neighbourhood new size must be bigger than ' + fanout +
    ', which it is the fanout value of the algorithm ' + algoId)
  var connections = this._coordi._connectionManager.getConnections()
  var toRemove = []
  debug('cons ' + connections)
  if (connections.length > n) {
    for (var i = 0; i < connections.length - n; i++) {
      toRemove.push(connections[i])
      this._coordi._connectionManager.deleteConnection(connections[i])
    }
  }
  debug('Next connections will be removed: ' + toRemove)
  this._coordi.workers[algoId].postMessage({ header: 'deleteViewItems', items: toRemove, newSize: n })
  this._coordi._connectionManager._maxNumOfCon = n
  debug('New neighbourhood size: ' + n)
}
GossipWrapper.prototype.getNeighbourhood = function () {
  return this._coordi._connectionManager.getConnections()
}
GossipWrapper.prototype.sendTo = function (neighbour, payload) {
  if (payload === undefined || payload === '') {
    debug('Message is empty or void')
    return
  }
  var connection = this._coordi._connectionManager.get(neighbour)
  if (!connection) {
    debug('There is no connection with: ' + neighbour)
    return
  }
  var msg = { service: 'APPLICATION', 'payload': payload, emitter: this._id }
  connection.send(msg)
}
GossipWrapper.prototype.sendToNeighbours = function(payload) {
  if (payload === undefined || payload === '') {
    debug('Message is empty or void')
    return
  }
  var connections = this._coordi._connectionManager.getConnections()
  if (connections.length === 0) {
    debug('There is no connection with others peers')
    return
  } else {
    for (var i = 0; i < connections.length; i++) this.sendTo(connections[i], payload)
  }
}
