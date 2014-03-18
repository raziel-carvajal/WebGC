(function(exports){
  function GossipProtocol(opts, defaultOpts){
    try{
      if( typeof opts === 'undefined' && typeof defaultOpts === 'undefined' )
        throw "Gossip configurations are undefined";
      this.options = opts || defaultOpts;
//      this.checkStdAttributes(this.options);
      this.initSuccess = true;
    } catch(e){
      this.initSuccess = false;
      console.log('Gossip protocol initialization fails (' + e + ')');
    }
  }


  GossipProtocol.prototype.increaseAge;
  GossipProtocol.prototype.getLog;
  GossipProtocol.prototype.selectPeer;
  GossipProtocol.prototype.getItemsToSend;
  GossipProtocol.prototype.selectItemsToKeep;

  GossipProtocol.prototype.checkStdMethods = function(){};

  exports.GossipProtocol = GossipProtocol;
})(this);
