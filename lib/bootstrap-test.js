peer = new GossipPeer({
  host: $('#peerserver-ip').text(),
  port: parseInt($('#peerserver-port').text()),
  debug: 3,
  logFunction: function(){
    var copy = Array.prototype.slice.call(arguments).join(' ');
    console.log(copy);
  },
  cacheSize: parseInt($('#cache-size').text()),
  firstViewSize: parseInt($('#first-view-size').text()),
  gossipLength: parseInt($('#l-parameter').text()),
  gossipPeriod: parseInt($('#gossip-period').text())
});

peer.on('open', function(id){

  window.setTimeout(function(){
    peer.emit('randomView'); 
  }, peer.options.gossipPeriod * 1);

});

window.onunload = window.onbeforeunload = function(e) {
  if (!!peer && !peer.destroyed) {
      peer.destroy();
    }
};
