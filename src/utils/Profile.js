module.exports = Profile
var debug = typeof window === 'undefined' ? require('debug')('profile') : require('debug').log

function Profile (payload) {
  if (!(this instanceof Profile)) return new Profile(payload)
  console.log('MY PROFILE IS: ' + JSON.stringify(payload))
  this._payload = payload
}

Profile.prototype.getPayload = function () { return this._payload }

Profile.prototype.setPayload = function (newPayload) {
  debug('SETTING PAYLOAD PROFILE FROM: ' + JSON.stringify(this._payload) + ' TO: ' + JSON.stringify(newPayload))
  this._payload = newPayload
}
