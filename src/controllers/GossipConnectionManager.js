module.exports = GossipConnectionManager
var debug = require('debug')('gossipCoManager')
var EventEmitter = require('events').EventEmitter

function GossipConnectionManager (gossipAlgos) {
  if (!(this typeof GossipConnectionManager)) return new GossipConnectionManager(gossipAlgos)
  EventEmitter.call(this)
  this._cons = {}
  for (var i = 0; i < gossipAlgos.length; i++)) this._initView(gossipAlgos[i])
}

GossipConnectionManager.prototype._initView = function (algoId) {
  if (this._cons[algoId]) return
  this._cons[algoId] = {}
}

GossipConnectionManager.prototype.updView = function (algoId, newView) {
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
  for (i = 0, var keys = Object.keys(oldView); i < keys.length; i++) {
    // keys[i] IN newView ? for arrays IN doesn't work as expected
    if (newView.indexOf(keys[i], 0) >= 0) {
      newView.splice(i,1)
    } else {
      this.emit('destroy', oldView[keys[i]], keys[i], oldView)
    }
  }
  for (i = 0; i < newView.length; i++) this.emit('connect', newView[i], oldView)
}
