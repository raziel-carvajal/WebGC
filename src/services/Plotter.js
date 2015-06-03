/**
* @module src/services*/
(function(exports){
  /**
  * @class Plotter
  * @description Plots an overlay representation of gossip algorithms, this class uses the
  * [Cytoscape.js]{@link http://js.cytoscape.org/} library for the graphics.
  * @param plotterId 
  * @param extraCons 
  * @param appDepFn 
  * @author Raziel Carvajal-Gomez <raziel.carvajal-gomez@inria.fr> <raziel.carvajal@gmail.com>*/
  function Plotter(plotterId, extraCons, appDepFn){
    this.loop = 0;
    this.logs = {};
    this.ref = plotterId;
    this.graphObjs = {};
    this.extraCons = extraCons;
    this.appDepFn = appDepFn;
  }
  
  /**
  * @method getShape
  * @description Returns the type of shape for one node.
  * @param i Positive integer not bigger than three
  * @return String Name of the shape*/
  Plotter.prototype.getShape = function(i){
    if(i === '0')
      return 'triangle';
    else if(i === '1')
      return 'ellipse';
    else if(i === '2')
      return 'octagon';
    else if(i === '3')
      return 'rectangle';
  };
 
  /**
  * @method getColor
  * @description Returns the HTML color for one node.
  * @param i Positive integer not bigger than three
  * @return String String of the HTML color*/
  Plotter.prototype.getColor = function(i){
    if(i === '0')
      return '#6FB1FC';
    else if(i === '1')
      return '#EDA1ED';
    else if(i === '2')
      return '#86B342';
    else if(i === '3')
      return '#F5A45D';
  };
  
  /**
  * @method getGraphFormat
  * @description Returns one object with the Cytoscape.js format to draw the nodes and
  * the edges in a graph.
  * @param emitter Identifier of the local peer
  * @param peers Peers in the hole overlay
  * @param view Peers in the view of the local peer
  * @return Object Object with the Cytoscape.js format to draw one graph*/
  Plotter.prototype.getGraphFormat = function(emitter, peers, view){
    var keys = Object.keys(peers);
    var nodes = [], edges = [];
    var i, s;
    for(i = 0; i < keys.length; i++){
      s = String(peers[ keys[i] ]);
      nodes.push({
        'data': {
          'id': keys[i],
          'name': keys[i],
          'profile': this.getShape( s ),
          'color': this.getColor( s )
        } 
      });
    }
    keys = view;
    s = String(peers[emitter]);
    for(i = 0; i < keys.length; i++){
      edges.push({
        'data': {
          'source': emitter,
          'target': keys[i],
          'color': this.getColor(s)
        }
      });
    }
    return { 'nodes': nodes, 'edges': edges };
  };
  
  /**
  * @method buildGraph
  * @description Draws the graph of a gossip overlay, every peer that participates in the protocol is
  * included but just the edges between the local peer and the peers in its view are drawn
  * @param algoId Identifier of the gossip algorithm
  * @param nodes List of nodes that participate in the gossip overlay
  * @param view View of the local peer*/
  Plotter.prototype.buildGraph = function(algoId, nodes, view){
    this.resetGraph(algoId);
    var eles = this.getGraphFormat(this.ref, nodes, view);
    //this.logger.info('For view ' + viewType + ' the elements are ' + JSON.stringify(eles));
    var layoutOpts = {
      name: 'circle',
      fit: true,
      padding: 50,
      avoidOverlap: true,
      startAngle: 1/2 * Math.PI,
      counterclockwise: true,
    };
    var nodeOpts = {
      'font-size': 30,
      'content': 'data(name)',
      'text-valign': 'center',
      'color': '#fff',
      'text-outline-width': 2,
      'text-outline-color': '#888',
      'width': '60px',
      'height': '60px',
      'shape': 'data(profile)',
      'background-color': 'data(color)'
    };
    var edgesOpts = {
      'curve-style': 'haystack',
      'opacity': 0.6,
      'width': 12,
      'line-color': 'data(color)'
    };
    var input = {
      container: document.getElementById(algoId),
      layout: layoutOpts,
      style: cytoscape.stylesheet()
        .selector('node')
          .css(nodeOpts)
        .selector('node:selected')
          .css({
            'background-color': '#000',
            'text-outline-color': '#000'
          })
        .selector('edge')
          .css(edgesOpts),
      elements: eles
    };
    this.graphObjs[algoId] = cytoscape(input);
    if( algoId.match('vicinity[0-9]') )
      this.appDepFn(view);
  };
  
  /**
  * @method resetGraph
  * @description Every graph is drawn when one gossip cycle has been completed, this
  * method clean ups the graphs container (html tag) when a new graph is ready to
  * be included in the container.
  * @param algoId Identifier of the gossip algorithm*/
  Plotter.prototype.resetGraph = function(algoId){
    if(this.loop !== 0){
      delete this.graphObjs[algoId];
      var gCont = document.getElementById('graphs'), sec, overlayName;
      if( algoId.match('cyclon[0-9]') ){
        gCont.removeChild(document.getElementById(algoId));
        sec = $('<div></div>').addClass('rpsContainer').attr('id', algoId);
        overlayName = 'RPS Overlay';
      }else if( algoId.match('vicinity[0-9]') ){
        gCont.removeChild(document.getElementById(algoId));
        sec = $('<div></div>').addClass('cluContainer').attr('id', algoId);
        overlayName = 'Clustering Overlay';
        var consAtChat = document.getElementById('connections').childNodes;
        var peerIds = [], i;
        for(i = 0; i < consAtChat.length; i++){
          if(consAtChat[i].getAttribute('id'))
            peerIds.push(consAtChat[i].getAttribute('id'));
        }
        gCont = document.getElementById('connections');
        for(i = 0; i < peerIds.length; i++)
          gCont.removeChild(document.getElementById(peerIds[i]));
        $('.filler').show();
        for(i = 0; i < peerIds.length; i++){
          if(this.extraCons[ peerIds[i] ]){
            //DataConnection.close()
            this.extraCons[ peerIds[i] ].close();
            delete this.extraCons[ peerIds[i] ];
          }
        }
        this.extraCons = {};
      }else{
        console.error('AlgoId is unknown, graph will not be deleted');
        return;
      }
      $('#graphs').append(sec);
      $('#' + algoId).append('<h1><strong>' + overlayName + '</strong></h1>');
    }
  };
  
  exports.Plotter = Plotter;
})(this);
