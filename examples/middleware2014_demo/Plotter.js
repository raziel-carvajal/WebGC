/**
* @module lib/utils
* @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr>
* TODO Finish with the doc of this file*/
(function(exports){
  
  function Plotter(loggingServer, plotterId){
    this.currentLoop = 0;
    this.cluLoop = 0;
    this.logs = {};
    this.logger = new Logger(loggingServer);
    this.logger.setOutput(plotterId, this.constructor.name);
    this.ref = plotterId;
  }
  
  Plotter.prototype.getGraphFormat = function(emitter, view){
    var keys = Object.keys(view);
    var nodes = [], edges = [];
    for(var i = 0; i < keys.length; i++){
      nodes.push({
        'data': {
          'id': keys[i],
          'name': keys[i]
        } 
      });
      var neighbours = view[ keys[i] ];
      for(var j = 0; j < neighbours.length; j++){
        if(neighbours[j] !== ""){
          edges.push({
            'data': {
              'source': keys[i],
              'target': neighbours[j]
            }
          });
        }
      }
    }
    return { 'nodes': nodes, 'edges': edges };
  };
  
  Plotter.prototype.buildGraph = function(viewType, view){
    this.logger.info('Building graph of type ' + viewType);
    var eles = this.getGraphFormat(this.ref, view);
    this.logger.info('For view ' + viewType + ' the elements are ' + JSON.stringify(eles));
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
      'color': 'white',
      'text-outline-width': 2,
      'text-outline-color': '#888',
      'width': '60px',
      'height': '60px'
    };
    var edgesOpts = {
      'curve-style': 'haystack',
      'opacity': 0.6,
      'width': 12,
      'line-color': '#A0B3D8'
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
    this.logger.info('graphcontainer is ' + graphContainer);
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
