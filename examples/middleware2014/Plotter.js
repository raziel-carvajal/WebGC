/**
* @module lib/utils
* @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr>
* TODO Finish with the doc of this file*/
(function(exports){
  
  function Plotter(loggingServer, plotterId){
    this.loop = 0;
    this.logs = {};
    this.logger = new Logger(loggingServer);
    this.logger.setOutput(plotterId, 'Plotter');
    this.ref = plotterId;
  }

  Plotter.prototype.getShape = function(i){
    if(i === '0'){
      return 'triangle';
    }else if(i === '1'){
      return 'ellipse';
    }else if(i === '2'){
      return 'octagon';
    }else if(i === '3'){
      return 'rectangle';
    }
  };
 
  Plotter.prototype.getColor = function(i){
    if(i === '0'){
      return '#6FB1FC';
    }else if(i === '1'){
      return '#EDA1ED';
    }else if(i === '2'){
      return '#86B342';
    }else if(i === '3'){
      return '#F5A45D';
    }
  };
  
  Plotter.prototype.getGraphFormat = function(emitter, peers, view){
    var keys = Object.keys(peers);
    var nodes = [], edges = [];
    var i;
    for(i = 0; i < keys.length; i++){
      nodes.push({
        'data': {
          'id': keys[i],
          'name': keys[i],
          'profile': this.getShape( peers[ keys[i] ]),
          'color': this.getColor( peers[ keys[i] ])
        } 
      });
    }
    keys = Object.keys(view);
    for(i = 0; i < keys.length; i++){
      edges.push({
        'data': {
          'source': emitter,
          'target': keys[i],
          'color': this.getColor(peers[emitter])
        }
      });
    }
    return { 'nodes': nodes, 'edges': edges };
  };
  
  Plotter.prototype.buildGraph = function(viewType, nodes, view){
    //this.logger.info('Building graph of type ' + viewType);
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
    var graphContainer;
    if(viewType === 'clu'){
      this.cluLoop++;
      graphContainer = 'clu-section';
    }
    if(viewType === 'rps'){
      this.currentLoop++;
      graphContainer = 'rps-section';
    }
    //this.logger.info('graphcontainer is ' + graphContainer);
    var input = {
      container: document.getElementById(graphContainer),
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
    var cy_instance = cytoscape(input);
  };
  
  exports.Plotter = Plotter;
})(this);
