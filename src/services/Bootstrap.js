/**
* @module src/services*/
(function(exports){
  
  /**
  * @class Bootstrap
  * @description For being able to join an overlay peers must receive at least one reference of
  * another peer (already in the overlay) to communicate with, most of the methods in this class 
  * communicate with one server which will provide a list of peers to bootstrap the exchange of gossip
  * messages. The bootstrap procedure works as follows: first of all, peers post its local profile
  * that is the payload contained in every gossip message then, peers request the reference of
  * another peer to perform a connection with it via the
  * [brokering server]{@link https://github.com/peers/peerjs-server}, finally, peers request a list
  * of peer references which will initialize every view of the gossip protocols (see attribute view
  * of [GossipProtocol]{@link module:src/superObjs#GossipProtocol}).
  * @param coordi Reference to the [Coordinator]{@link module:src/controllers#Coordinator}
  * @author Raziel Carvajal-Gomez <raziel.carvajal-gomez@inria.fr> <raziel.carvajal@gmail.com>*/
  function Bootstrap(coordi){
    if(!(this instanceof Bootstrap)){ return new Bootstrap(coordi); }
    this.coordi = coordi;
    this.url = 'http://' + coordi.options.host + ':' + coordi.options.port + '/';
  }
  
  /**
  * @method bootstrap
  * @description This method performs the hole bootstraping procedure (described on the
  * top of this file).*/
  Bootstrap.prototype.bootstrap = function(){
    this.coordi.log.info('Posting profile');
    this.postProfile();
    this.coordi.log.info('Wating: ' + this.coordi.bootstrapTimeout + ' ms for peers ' +
      'being registered in the server');
    var self = this;
    window.setTimeout(function(){
    self.coordi.log.info('Getting first peer');
    self.getNeighbour();
    self.coordi.log.info('Getting first view now');
    self.getFirstView();
    }, this.coordi.bootstrapTimeout);
  };
  
  /**
  * @method postProfile
  * @description Post in the [brokering server]{@link https://github.com/peers/peerjs-server} the
  * peer's profile, which is the payload to exchange on each gossip message.*/
  Bootstrap.prototype.postProfile = function(){
    var xhr = new XMLHttpRequest();
    var self = this;
    xhr.open('POST', this.url + 'profile', true);
    xhr.setRequestHeader('Content-type', 'text/plain');
    xhr.onreadystatechange = function(){
      if (xhr.readyState !== 4){ return; }
      if (xhr.status !== 200) { xhr.onerror(); return; }
      var res = JSON.parse(xhr.responseText);
      if(res.success)
        self.coordi.log.info('profile was posted properly');
      else
        self.coordi.log.error('profile was not posted');
    };
    xhr.onerror = function(){
      self.coordi.log.error('while posting profile on server');
    };
    var msg = {id: this.coordi.id, profile: this.coordi.profile};
    xhr.send(JSON.stringify(msg));
  };
  
  /**
  * @method getFirstView
  * @description Gets from the [brokering server]{@link https://github.com/peers/peerjs-server} the
  * first list of peers to start exchanging messages.*/
  Bootstrap.prototype.getFirstView = function() {
    var http = new XMLHttpRequest();
    http.open('get', this.url + this.coordi.options.key +
      '/' + this.coordi.id + '/view', true);
    var self = this;
    http.onerror = function(e) {
      self.coordi.log.error('Error retrieving the view of IDs');
      self.coordi._abort('server-error', 'Could not get the random view');
    };
    
    http.onreadystatechange = function() {
      if (http.readyState !== 4){ return; }
      if (http.status !== 200) { http.onerror(); return; }
      //self.coordi.log.info('First view: ' + http.responseText);
      var data = JSON.parse(http.responseText);
      if(data.view.length !== 0){
        var algoIds = Object.keys(self.coordi.workers);
        for(var i = 0; i < algoIds.length; i++)
          self.coordi.workers[ algoIds[i] ].postMessage({
            header: 'firstView',
            view: data.view
          });
      }else{
        self.coordi.log.error('First view is empty, scheduling req again');
        window.setTimeout(function(){ self.getFirstView(); }, 5000);
      }
    };
    
    http.send(null);
  };
  
  /**
  * @method getNeighbour
  * @description Gets one first peer reference to perform the first connection with it.*/
  Bootstrap.prototype.getNeighbour = function(){
    var http = new XMLHttpRequest();
    http.open('get', this.url + this.coordi.id + '/neighbour', true);
    var self = this;
    http.onerror = function(e) {
      self.coordi.log.error('Error while retrieving first neighbour');
      self.coordi._abort('server-error', 'No peer for doing first connection');
    };
    
    http.onreadystatechange = function() {
      if (http.readyState !== 4){ return; }
      if (http.status !== 200) { http.onerror(); return; }
      self.coordi.log.info('First peer: ' + http.responseText);
      var data = JSON.parse(http.responseText);
      if(data){
        self.coordi.log.info('Doing first connection with: ' + data.neighbour);
        if(data.neighbour !== 'void'){
          var msg = {
            service: 'VOID',
            emitter: self.coordi.id,
            receiver: data.neighbour
          };
          self.coordi.sendTo(msg);
        }//Peer with "void" as neighbour will be contacted eventually by another peer
      }else
        self.coordi.log.error('No peer for doing first connection');
    };
    
    http.send(null);
  };
  
  exports.Bootstrap = Bootstrap;
})(this);
