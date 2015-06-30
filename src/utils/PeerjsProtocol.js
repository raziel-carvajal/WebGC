module.exports = PeerJSProtocol
PeerJSProtocol.MSGS = {
  OPEN: 1, ERROR: 2, ID-TAKEN: 3,
  INVALID-KEY: 4, LEAVE: 5, EXPIRE: 6,
  OFFER: 7, ANSWER: 8, CANDIDATE: 9
}

function PeerJSProtocol () {
  this._open = false
  this._peer = peer
  // TODO code Socket compatible with NodeJS and window.WebSocket
  // this._socket
  
}
