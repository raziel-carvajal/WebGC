(function (exports) {
  var $ = exports.$
  var cytoscape = exports.cytoscape
  /**
  * @class Plotter
  * @description Plots an overlay representation of gossip algorithms, this class uses the
  * [Cytoscape.js]{@link http://js.cytoscape.org/} library for the graphics.
  * @param plotterId
  * @author Raziel Carvajal-Gomez <raziel.carvajal@gmail.com>*/
  function Plotter (plotterId) {
    this.logs = {}
    this.ref = plotterId
    this.graphObjs = {}
  }
  /**
  * @memberof Plotter
  * @method getColor
  * @description Returns the HTML color for one node.
  * @param i Positive integer not bigger than three
  * @return String String of the HTML color*/
  Plotter.prototype.getColor = function (i) {
    if (i === 0) return '#6FB1FC'
    else if (i === 1) return '#EDA1ED'
    else if (i === 2) return '#86B342'
    else if (i === 3) return '#F5A45D'
    else console.log('Node color is not recognized')
  }
  /**
  * @memberof Plotter
  * @method getGraphFormat
  * @description Returns one object with the Cytoscape.js format to draw the nodes and
  * the edges in a graph.
  * @param emitter Identifier of the local peer
  * @param peers Peers in the hole overlay
  * @param view Peers in the view of the local peer
  * @return Object Object with the Cytoscape.js format to draw one graph*/
  Plotter.prototype.getGraphFormat = function (peers, view) {
    var nodes = []
    var edges = []
    var toIgn = []
    var i, nodeColor
    for (i = 0; i < view.length; i++) if (peers.indexOf(view[i], 0) === -1) toIgn.push(view[i])
    for (i = 0; i < peers.length; i++) {
      nodeColor = view.indexOf(peers[i], 0) !== -1 || this.ref === peers[i] ? this.getColor(0) : this.getColor(1)
      nodes.push({ 'data': { 'id': peers[i], 'name': peers[i], 'color': nodeColor } })
    }
    for (i = 0; i < view.length; i++) {
      if (toIgn.indexOf(view[i], 0) === -1) {
      edges.push({ 'data': { 'source': this.ref, 'target': view[i], 'color': this.getColor(0) } })
      }
    }
    return { 'nodes': nodes, 'edges': edges }
  }
  /**
  * @memberof Plotter
  * @method buildGraph
  * @description Draws the graph of a gossip overlay, every peer that participates in the protocol is
  * included but just the edges between the local peer and the peers in its view are drawn
  * @param algoId Identifier of the gossip algorithm
  * @param nodes List of nodes that participate in the gossip overlay
  * @param view View of the local peer*/
  Plotter.prototype.buildGraph = function (algoId, nodes, view) {
    this.resetGraph(algoId)
    var eles = this.getGraphFormat(nodes, view)
    var layoutOpts = {
      name: 'circle',
      fit: true,
      padding: 50,
      avoidOverlap: true,
      startAngle: 1 / 2 * Math.PI,
      counterclockwise: true
    }
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
    }
    var edgesOpts = {
      'curve-style': 'haystack',
      'opacity': 0.6,
      'width': 12,
      'line-color': 'data(color)'
    }
    var selectedNode = { 'background-color': '#000', 'text-outline-color': '#000' }
    var input = {
      container: document.getElementById(algoId),
      layout: layoutOpts,
      style: cytoscape.stylesheet()
        .selector('node').css(nodeOpts)
        .selector('node:selected').css(selectedNode)
        .selector('edge').css(edgesOpts),
      elements: eles
    }
    this.graphObjs[algoId] = cytoscape(input)
  }
  /**
  * @memberof Plotter
  * @method resetGraph
  * @description Every graph is drawn when one gossip cycle has been completed, this
  * method clean ups the graphs container (HTML tag) when a new graph is ready to
  * be included in the container.
  * @param algoId Identifier of the gossip algorithm*/
  Plotter.prototype.resetGraph = function (algoId) {
    console.log('ALGO ID: ' + algoId)
    var gCont = document.getElementById('graphs')
    gCont.removeChild(document.getElementById(algoId))
    delete this.graphObjs[algoId]
    var sec, overlayName
    if (algoId === 'rpsGraph') {
      sec = $('<div></div>').addClass('rpsContainer').attr('id', algoId)
      overlayName = 'RPS Overlay'
    } else if (algoId === 'clusteringGraph') {
      sec = $('<div></div>').addClass('cluContainer').attr('id', algoId)
      overlayName = 'Clustering Overlay'
      // var consAtChat = document.getElementById('connections').childNodes
      // var peerIds = []
      // var i
      // for (i = 0; i < consAtChat.length; i++) {
      //   if (consAtChat[i].getAttribute('id')) {
      //     peerIds.push(consAtChat[i].getAttribute('id'))
      //   }
      // }
      // gCont = document.getElementById('connections')
      // for (i = 0; i < peerIds.length; i++) {
      //   gCont.removeChild(document.getElementById(peerIds[i]))
      // }
      // $('.filler').show()
      // for (i = 0; i < peerIds.length; i++) {
      //   if (this.extraCons[peerIds[i]]) {
      //     // DataConnection.close()
      //     this.extraCons[peerIds[i]].close()
      //     delete this.extraCons[peerIds[i]]
      //   }
      // }
      // this.extraCons = {}
    } else {
      console.log('ERROR: AlgoId is unknown, graph will not be deleted')
      return
    }
    var header = '<h1><strong>' + overlayName + '</strong></h1>'
    sec.append(header)
    $('#graphs').append(sec)
  }
  exports.Plotter = Plotter
})(this)
