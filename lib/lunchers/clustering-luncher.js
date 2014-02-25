var peerServer = {
  ip: $('#peerserver-ip').text(),
  port: parseInt( $('#peerserver-port').text() )
};

var str = $('#push').text(), push, pull;
switch( str ){
  case 'true':
    push = true;
  break;
  case 'false':
    push = false;
  break;
  default:
    push = true;
  break;
}
str = $('#pull').text();
switch( str ){
  case 'true':
    pull = true;
  break;
  case 'false':
    pull = false;
  break;
  default:
    pull = true;
  break;
}

var gossipOptions = {
  propagationPolicyPush: push,
  propagationPolicyPull: pull,
  firstViewSize: parseInt( $('#cyclon-view').text() ),
  gossipPeriod: parseInt( $('#gossip-period').text() ),
  vicinityView: parseInt( $('#vicinity-view').text() ),
  vicinityLength: parseInt( $('#vicinity-length').text() ),
  vicinitySimilarity: parseInt( $('#prox-val').text() ),
  vicinitySelection: $('#vicinity-sel').text(),
  cyclonView: parseInt( $('#cyclon-view').text() ),
  cyclonLength: parseInt( $('#cyclon-length').text() )
};

peer = new GossipPeer({
  host: peerServer.ip,
  port: peerServer.port,
  debug: 3,
  logFunction: function(){
    var copy = Array.prototype.slice.call(arguments).join(' ');
    console.log(copy);
  },
  gossipOpts: gossipOptions
});

window.onunload = window.onbeforeunload = function(e) {
  if (!!peer && !peer.destroyed) {
      peer.destroy();
    }
};
