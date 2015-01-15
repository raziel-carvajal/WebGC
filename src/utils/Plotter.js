/**
* @module lib/utils
* @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr>
* TODO Finish with the doc of this file*/
(function(exports){
  
  function Plotter(opts){
    this.plotterId = opts.plotterId;
    this.host = opts.peerJsOpts.host;
    this.port = opts.peerJsOpts.port;
    this.plotterTimeout = opts.plotterTimeout;
    this.currentLoop = 0;
    this.logs = {};
    this.logger = new Logger(opts.loggingServer);
    this.logger.setOutput(this.plotterId, this.constructor.name);
    this.ref = opts.focusOn;
    this.announcePlotter();
    this.map = this.dictPeerIdToName();
    
    Peer.call(this, this.plotterId, opts.peerJsOpts);
    
    var self = this;
    this.on('open', function(id){
      window.setInterval( function(){ 
        self.buildGraph();
      }, 60000);
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
    var nodeColor = this.getNodeBackground(profile);
    var node = { 
      data: { 
        id:  emitter, 
        name: this.map[emitter], 
        faveColor: nodeColor,
        faveShape: 'ellipse'
      } 
    };
    var edges = [];
    var edgeColor = '#ddd';
    if( this.ref === emitter )
      edgeColor = nodeColor;
    for( var i = 0; i < view.length; i++ )
      edges.push( { 
        data: { 
          source: emitter, 
          target: view[i],
          faveColor: edgeColor,
        },
        classes: 'questionable'
      });
    return { 'node': node, 'edges': edges };
  };
  
  Plotter.prototype.buildGraph = function(){
    var loop = this.currentLoop.toString();
    this.logger.error( JSON.stringify(this.logs) );
    if( this.logs[loop].hasOwnProperty('nodes') && this.logs[loop].hasOwnProperty('edges') ){
      $('#cy').cytoscape({
        layout: {
          name: 'cose',
          padding: 10
        },
        style: cytoscape.stylesheet()
          .selector('node')
            .css({
              'shape': 'data(faveShape)',
              'width': 'mapData(weight, 40, 80, 20, 60)',
              'content': 'data(name)',
              'text-valign': 'center',
              'text-outline-width': 2,
              'text-outline-color': 'data(faveColor)',
              'background-color': 'data(faveColor)',
              'color': '#fff'
            })
          .selector(':selected')
            .css({
              'border-width': 3,
              'border-color': '#333'
            })
          .selector('edge')
            .css({
              'opacity': 0.666,
              'width': 'mapData(strength, 70, 100, 2, 6)',
              /*'target-arrow-shape': 'triangle',*/
              /*'source-arrow-shape': 'circle',*/
              'line-color': 'data(faveColor)',
              'source-arrow-color': 'data(faveColor)',
              'target-arrow-color': 'data(faveColor)'
            })
          .selector('edge.questionable')
            .css({
              /*'line-style': 'dotted',*/
              'target-arrow-shape': 'triangle'
            })
          .selector('.faded')
            .css({
              'opacity': 0.25,
              'text-opacity': 0
            }),
        elements: {
          nodes: this.logs[loop].nodes,
          edges: this.logs[loop].edges
        },
        ready: function(){
          window.cy = this;
        }
      });
      this.currentLoop++;
    }
  };
  
  Plotter.prototype.contains = function(node, list){
    for(var i = 0; i < list.length; i ++ ){
      if( list[i].data.id === node )
        return true;
    }
    return false;
  };
  
  Plotter.prototype.dictPeerIdToName = function(){
    return { 'peer_1': 'Jhon', 'peer_2': 'Mark', 'peer_3': 'Carl', 'peer_4': 'Zoe', 
      'peer_5': 'Kim', 'peer_6': 'Rima', 'peer_7': 'Matt', 'peer_8': 'Lucy', 
      'peer_9': 'Mino', 'peer_10': 'Kido' };
  };
  
  Plotter.prototype.handleConnection = function(c){
    if( c.label === 'Vicinity' ){
      var self = this;
      c.on('data', function(payload){
        var loop = payload.loop;
        loop = loop.toString();
        if( !self.logs.hasOwnProperty(loop) ){
          self.logs[loop] = { nodes: [], edges: [] };
        }
        var graphDict = self.getGraphFormat(payload.peer, payload.profile, payload.view);
        var nodesRef = self.logs[loop].nodes; var edgesRef = self.logs[loop].edges;
        nodesRef.push( graphDict.node );
        for( var i = 0; i < graphDict.edges.length; i ++)
          edgesRef.push( graphDict.edges[i] );
      });
    }
  };
  
  Plotter.prototype.getNodeBackground = function(payload){
    var selection;
    switch(payload){
      case 1:
        selection = '#6FB1FC';// blue
        break;
      case 2:
        selection = '#EDA1ED';// pink
        break;
      case 3:
        selection = '#86B342';// green
        break;
      case 4:
        selection = '#F5A45D';// orange
        break;
      default:
        break;
    }
    return selection;
  };
  
  exports.Plotter = Plotter;
})(this);
