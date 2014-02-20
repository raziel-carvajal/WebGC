var gossipOptions = {
  selectionPolicy: $('#sel-pol').text(),
  propagationPolicyPush: true,
  propagationPolicyPull: true,
  healing: parseInt($('#healing').text()),
  swap: parseInt($('#swap').text()),
  viewSize: parseInt($('#view-size').text())
};


peer = new GossipPeer({
  host: $('#peerserver-ip').text(),
  port: parseInt($('#peerserver-port').text()),
  debug: 3,
  logFunction: function(){
    var copy = Array.prototype.slice.call(arguments).join(' ');
    console.log(copy);
  },
  gossipOpts: gossipOptions,
  firstViewSize: parseInt($('#view-size').text()),
  gossipPeriod: parseInt($('#gossip-period').text())
});

peer.on('open', function(id){
  window.setTimeout(function(){
    peer.emit('randomView'); 
  }, peer.options.gossipPeriod * 2);

});

window.onunload = window.onbeforeunload = function(e) {
  if (!!peer && !peer.destroyed) {
      peer.destroy();
    }
};
