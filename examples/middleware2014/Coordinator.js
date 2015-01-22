/** 
* @module lib/controllers */
(function(exports){
  /**
  * @class Coordinator
  * @augments Peer
  * @description This class coordinates the execution of a set of gossip-based protocols. The
  * protocols are described in a configuration object, this object is the only parameter in
  * the constructor of the Coordinator object. Like every executor in the current module, 
  * this executor is a sub-class of the Peer object (from PeerJS). When an object of this 
  * class is created a unique ID will be requested to an instance of the PeerServer object 
  * in order to bootstrap the exchange of messages with WebRTC. When the constructor of the
  * Peer object is lunched a "get identifier" request is performed.
  * @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr> */
  function Coordinator(opts){
    if( !(this instanceof Coordinator) )
      return new Coordinator(opts);
    this.connectedPeers = {};
    this.first = 0;
    this.profile = opts.gossipAlgos.vicinity1.data;
    this.log = new Logger(opts.loggingServer, opts.peerId, this.constructor.name);
    this.factory = new GossipFactory( {loggingServer: opts.loggingServer, peerId: opts.peerId});
    var algosNames = Object.keys(opts.gossipAlgos);
    this.plotter = opts.plotter;
    var algo;
    for( var i = 0; i < algosNames.length; i++ ){
      algo = opts.gossipAlgos[ algosNames[i] ];
      this.factory.createProtocol(algo, algosNames[i]);
    }
    this.factory.setDependencies(opts.gossipAlgos);
    this.protocols = this.factory.inventory;
    this.gossipUtil = new GossipUtil({
      loggingServer: opts.loggingServer,
      peerId: opts.peerId,
      objName: this.constructor.name
    });
    this.plotterObj = new Plotter(opts.loggingServer, opts.peerId);
    /** 
     * This method fires the constructor of the [Peer]{@link Peer} object. */
    Peer.call(this, opts.peerId, opts.peerJsOpts);
    /** 
     * @event Coordinator#open
     * Once the [PeerServe]{@link PeerServer} gives an [id]{@link id} to the local peer
     * the function in this event is performed. */
    var self = this;
    this.on('open', function(){ 
      window.setTimeout( function(){ self.getFirstView(); }, 3000 );
      window.setInterval( function(){ self.getGraph('rps'); }, 11000);
      window.setInterval( function(){ self.getGraph('clu'); }, 11000);
      window.setInterval( function(){ self.first = 1; }, 21000);
    });
    /**
    * @event Coordinator#connection
    * @description This event is fired when a remote peer contacts the local peer via 
    * [the method]{@link DataConnection#send}. The actions of this event are linked with 
    * [the method]{@link ClusteringExecutor#handleConnection}. */
    this.on('connection', function(c){ 
      if(c.label === 'chat')
        self.handleChatMsg(c);
      else
        self.handleConnection(c); 
    });
    /**
     * @event Coordinator#doActiveThread
     * This event performs the active thread of the gossip protocols in the
     * [protocols]{@link Coordinator#protocols} object. This event is linked with [the method]
     * {@link ClusteringExecutor#doActiveThread}. */
    this.on('doActiveThread', function(view){
      var i, protocol, keys = Object.keys(self.protocols);
      for( i = 0; i < keys.length; i++ ){
        protocol = self.protocols[ keys[i] ];
        protocol.initialize(view);
      }
      window.setInterval( function(){
        var keys = Object.keys(self.protocols);
        for( var i = 0; i < keys.length; i++ )
          self.doActiveThread( self.protocols[ keys[i] ] );
      }, 5000 );
    });
  }
  
  util.inherits(Coordinator, Peer);
  /**
  * This function was added for handling chat messages for the Middleware2014 demo*/  
  Coordinator.prototype.handleChatMsg = function(c){
    var chatbox = $('<div id="' + c.peer + '" class="connection active"></div>');
    var header = $('<h1></h1>').html('Chat with <strong>' + c.peer + '</strong>');
    var messages = $('<div class="messages"><em>Peer connected.</em></div>');
    chatbox.append(header);
    chatbox.append(messages);
    $('#wrap').append(chatbox);
    // Select connection handler.
    $('#' + c.peer).click(function() {
      if ($('#' + c.peer).attr('class').indexOf('active') === -1) {
        $('#' + c.peer).addClass('active');
      } else {
        $('#' + c.peer).removeClass('active');
      }
    });
    $('.filler').hide();
    $('#connections').append(chatbox);
    c.on('data', function(data) {
      console.info('Data received');
      console.debug(data);
      messages.append('<div><span class="peer">' + c.peer + '</span>: ' + data + '</div>');
    });
    var self = this;
    c.on('close', function() {
      alert(c.peer + ' has left the chat.');
      chatbox.remove();
      if ($('.connection').length === 0) {
        $('.filler').show();
      }
      delete self.connectedPeers[c.peer];
    });
    this.connectedPeers[c.peer] = 1;
  };
  /**
  * @method handleConnection
  * @description This method performs the passive thread of each gossip-based protocol in the object 
  * Coordinator.protocols
  * @param {DataConnection} connection - This connection allows the exchange of meesages amog peers. */
  Coordinator.prototype.handleConnection = function(connection){
    var protocol = this.protocols[connection.label];
    var self = this;
    connection.on('data', function(data){
      protocol.selectItemsToKeep(self.id, data);
    });
    connection.on('open', function(){
      if( protocol.propagationPolicy.pull ){
        var payload = protocol.getItemsToSend(self.id, connection.peer, 'passive');
        connection.send(payload);
      }
    });
    connection.on('error', function(err){
      self.log.error('During the reception of a ' + protocol.class + ' message');
      self.log.error(err);
    });
  };
  /** 
  * @method doActiveThread
  * @description This method performs the active thread of each gossip-based protocol in the 
  * Coordinator.protocols object.*/
  Coordinator.prototype.doActiveThread = function(protocol){
    var logi = protocol.protoId + '_' + protocol.loop + '_' + this.id + '_' + protocol.getLog();
    this.log.info(logi);
    protocol.loop++;
    var dstPeer = protocol.selectPeer();
    protocol.increaseAge();
    var connection = this.connect(dstPeer, { label: protocol.protoId });
    var self = this;
    /** As soon as the connection is ready to send data, this event will be fired. */
    connection.on('open', function(){
      var payload = {};
      if( protocol.propagationPolicy.push )
        payload = protocol.getItemsToSend(self.id, connection.peer, 'active');
      connection.send( payload );
    });
    /** This event is fired when a response of a remote peer is expected. */
    connection.on('data', function(data){
      if( protocol.propagationPolicy.pull )
        protocol.selectItemsToKeep(self.id, data);
    });
    /** This event is fired when there is an error in the connection. */
    connection.on('error', function(err){
      self.log.error('During the emition of a ' + protocol.class + ' message. ' + err);
    });
  };
  /**
  * @method sendToPlotter
  * @description This method sends the peer's neighbours of each protocol. For 
  * instance, in a clustering protocol two kind of neighbours could be sent: i)
  * the neighbours of the random overlay and ii) the most similar neighbours (
  * peers of a cluster) */ 
  //Coordinator.prototype.sendToPlotter = function(msg, algoType){
  //  var http = new XMLHttpRequest();
  //  var viewStr = '';
  //  for(var i = 0; i < msg.view.length; i++)
  //    viewStr += msg.view[i] + '___';
  //  var url = 'http://' + this.options.host + ':' + this.options.port + '/viewForPlotter';
  //  http.open('post', url, true);
  //  http.setRequestHeader('Content-Type', 'application/json');
  //  http.send(JSON.stringify({
  //    'id': this.id,
  //    'data': msg.profile,
  //    'loop': msg.loop,
  //    'algo': algoType,
  //    'view': viewStr
  //  }));
  //  var self = this;
  //  http.onerror = function(e) {
  //    self.log.error('Trying to send type view ' + algoType + ' to plotter');
  //  };
  //  http.onreadystatechange = function() {
  //    if (http.readyState !== 4) {
  //      return;
  //    }
  //    if (http.status !== 200) {
  //      http.onerror();
  //      return;
  //    }
  //    self.log.info('No errors in sendToPlotter func');
  //  };
  //};
  
  /**
  * @method getPeers
  * @desc This method gets the view GossipProtocol.view of each gossip protocol in the 
  * Coordinator.protocols object. The view of each protocol is identified in a unique way 
  * by a string.
  * @returns {Object} Object that contains the view of each gossip protocol in the 
  * Coordinator.protocols object. */ 
  Coordinator.prototype.getPeers = function(){
    var result = {}, keys = this.protocols.Object.keys();
    var key, value;
    for( var i = 0; i < keys.length; i++ ){
      key = this.protocols[i].class;
      value = this.protocols[i].view;
      result[ key ] = value;
    }
    return result;
  };
  /**
   * @method getFirstView
   * @desc This method gets from a remote PeerServer a set of remote peer identifiers. This 
   * set of identifiers allows to bootstrap the gossip protocols. */
  Coordinator.prototype.getFirstView = function() {
    var http = new XMLHttpRequest();
    var protocol = this.options.secure ? 'https://' : 'http://';
    var url = protocol + this.options.host + ':' + this.options.port + '/' + this.options.key + 
      '/' + this.id + '/' + this.profile + '/view';
    http.open('get', url, true);
    var self = this;
    http.onerror = function(e) {
      self.log.error('Error retrieving the view of IDs');
      self._abort('server-error', 'Could not get the random view');
    };
    http.onreadystatechange = function() {
      if (http.readyState !== 4) {
        return;
      }
      if (http.status !== 200) {
        http.onerror();
        return;
      }
      /** 
      * @fires Coordinator#doActiveThread */
      var data = JSON.parse(http.responseText);
      if(data.view.length !== 0)
        self.emit('doActiveThread', data.view);
      else
        window.setTimeout( function(){ self.getFirstView(); }, 5000 );
    };
    http.send(null);
  };

  Coordinator.prototype.getGraph = function(viewType) {
    var loop = this.plotterObj.loop;
    this.log.info('Getting graph with loop ' + loop);
    var http = new XMLHttpRequest();
    var url = 'http://' + this.options.host + ':' + this.options.port + '/' + this.options.key + 
      '/' + this.id + '/getGraph';
    var self = this;
    http.open('get', url, true);
    http.onerror = function(e) {
      self.log.error('Trying to get graph for loop ' + loop);
    };
    http.onreadystatechange = function() {
      if (http.readyState !== 4) {
        return;
      }
      if (http.status !== 200) {
        http.onerror();
        return;
      }
      self.log.info('Graph ' + http.responseText + ' for loop ' + loop);
      var nodes = JSON.parse(http.responseText);
      var neighbours;
      if(viewType === 'clu')
        neighbours = self.protocols.vicinity1;
      if(viewType === 'rps')
        neighbours = self.protocols.cyclon1;
      console.info('View type: ' + viewType);
      console.info( JSON.stringify(neighbours.view) );
      self.plotterObj.buildGraph(viewType, nodes, neighbours.view);
      self.plotterObj.loop++;
    };
    http.send(null);
  };

  exports.Coordinator = Coordinator;
})(this);
