(function(exports){
  
  function Plotter(opts){
    this.plotterId = opts.plotterId;
    this.host = opts.peerJsOpts.host;
    this.port = opts.peerJsOpts.port;
    this.plotterTimeout = opts.plotterTimeout;
    this.currentLoop = 0;
    this.history = { this.currentLoop: {nodes: [], edges: []} };
    
    this.announcePlotter();
    
    Peer.call(this, this.plotterId, opts.peerJsOpts);
    
    var self = this;
    this.on('open', function(id){
      console.log('Logger [' + id + '] is in the overlay');
//      window.setInterval( self.buildGraph, self.plotterTimeout);
    });
    
    this.on('connection', function(c){ self.handleConnection(c); });
  }
  
  util.inherits(Plotter, Peer);
  
  Plotter.prototype.announcePlotter = function(){
    var http = new XMLHttpRequest();
    var url = 'http://' + this.host + ':' + this.port + '/plotter';
    http.open('post', url, true);
    http.setRequestHeader('Content-Type', 'application/json');
    http.send(JSON.stringify( {plotterId: this.plotterId} ));
  };
  
  Plotter.prototype.getGraphFormat = function(emitter, profile, view){
    var node = { 
      data: { 
        id: emitter, 
        name: emitter, 
        faveColor: this.getNodeBackground(profile),
        faveShape: 'ellipse'
      } 
    };
    var edges = [];
    for( var i = 0; i < view.length; i++ )
      edges.push( { data: { source: emitter, target: view[i] } } );
    return { 'node': node, 'edges': edges };
  };
  
  Plotter.prototype.buildGraph = function(){
    var elements = { nodes: [], edges: [] };
    
  };
  
  Plotter.prototype.contains = function(node, list){
    for(var i = 0; i < list.length; i ++ ){
      if( list[i].data.id === node )
        return true;
    }
    return false;
  };
  
  Plotter.prototype.handleConnection = function(c){
    var self = this;
    c.on('data', function(payload){
      var dataDic = self.history[payload.loop];
      console.log( 'Payload: ' + JSON.stringify(payload) );
//      self.history[ payload.loop ].push(payload.data);
    });
  };
  
  Plotter.prototype.getNodeBackground = function(payload){
    var selection;
    switch(payload){
      case 1:
        selection = 'color?';
        break;
      case 2:
        selection = 'color?';
        break;
      case 3:
        selection = 'color?';
        break;
      case 4:
        selection = 'color?';
        break;
      case 5:
        selection = 'color?';
        break;
      default:
        break;
    }
    return selection;
  };
  
  exports.Plotter = Plotter;
})(this);
