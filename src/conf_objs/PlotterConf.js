/**
* @module lib/conf_objs
* @const plotterOpts
* @description This object contains the settings of the PeerJS peer that draws an overlay of gossip peers
* @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr>*/
var plotterOpts = {
  plotterId: 'plotter',
  plotterTimeout: 20000,//Every 20s the neighbours of every peer in the overlay will be shown
  peerJsOpts: {
    host: 'localhost',//address of a PeerServer
    port: 9000,//port of a PeerServer
    debug: 3,
    logFunction: function(){
      var msg = Array.prototype.slice.call(arguments).join(' ');
      console.log(msg);
    }
  },
  loggingServer: {
    host: 'localhost',
    port: 9001
  },
  focusOn: 'peer_1'//peer identifier to focus
};
