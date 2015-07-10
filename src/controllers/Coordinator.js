/**
* @module src/controllers*/
var debug = require('debug')('coordinator')
var its = require('its')
var hat = require('hat')
var GossipUtil = require('../utils/GossipUtil')
var GossipFactory = require('../services/GossipFactory')
var Bootstrap = require('../services/Bootstrap')
var ConnectionManager = require('../controllers/ConnectionManager')
/**
* @class Coordinator
* @extends Peer See [Peer]{@link http://peerjs.com/docs/#api} class in PeerJS
* @description This class coordinates the execution of a set of gossip-based protocols. The
* protocols are described in a configuration object (see
* [configurationObj]{@link module:src/confObjs.configurationObj}). In order to avoid
* reinventing the wheel, Coordinator extends the [Peer]{@link http://peerjs.com/} class from PeerJS
* (which provides a WebRTC wrapper with P2P communication functionalities like: send/receive
* functions, serialization of objects, management of media and data connections, etc)
* and manages every external connection with other peers. Moreover, this class acts as
* an intermediary between any web application and the
* [GossipMediator]{@link module:src/controllers.GossipMediator#setDependencies} class to decide what to do with
* gossip messages for instance, if one gossip algorithm needs to a send message M to peer
* P then the Coordinator is going to receive M (via the GossipMediator) to initiate what
* it is necessarily for the connection (looking for a method for reaching P here there are two
* possible cases to reach P, either the Coordinator contacts the
* [brokering server]{@link https://github.com/peers/peerjs-server} or the Coordinator uses the
* [LookupService]{@link module:src/services#LookupService}) and in that way sending M to P.
* @param opts Property "peerJsOpts" of the configuration object (see
* [configurationObj]{@link module:src/confObjs#configurationObj} for more details)
* @param profile The content of a user's profile is application dependant, besides an especial
* format is required for this object. The properties of the object must coincide with the
* algorithms identifiers in the property "gossipAlgos" in
* [configurationObj]{@link module:src/confObjs#configurationObj}
* @param id Unique identifier of the peer, if this parameter is not specified one
* random id will be created by the [brokering server]{@link https://github.com/peers/peerjs-server}
* @author Raziel Carvajal-Gomez  <raziel.carvajal@gmail.com>*/
function Coordinator (gossConfObj, profile, id) {
  if (!(this instanceof Coordinator)) return new Coordinator(gossConfObj, profile, id)
  if (!this.checkConfFile(gossConfObj)) return
  its.defined(profile)
  its.defined(gossConfObj.signalingService)
  its.defined(gossConfObj.gossipAlgos)
  its.defined(gossConfObj.statsOpts)
  this.profile = profile
  this.id = id || hat()
  this._signalingService = gossConfObj.signalingService
  this.gossipAlgos = gossConfObj.gossipAlgos
  this.statsOpts = gossConfObj.statsOpts
  if (this.statsOpts.activated) {
    this.actCycHistory = {}
    this.vieUpdHistory = {}
  }
  try {
    this._usingSs = gossConfObj.usingSs
    this.gossipUtil = new GossipUtil(debug)
    this.factory = new GossipFactory(this.gossipUtil)
    this.createAlgorithms()
  } catch (e) {
    debug('During the instantiaton of gossip objects. ' + e)
  }
}

/**
* @memberof Coordinator
* @method start
* @description Basically, this method instantiates: i) the [Peer]{@link http://peerjs.com/docs/#api}
* object, ii) the LookupService (if it is
* specified in the configuration object) and iii) every implementation of the gossip algorithms. In point
* iii one [web worker]{@link http://www.w3schools.com/html/html5_webworkers.asp} environment is created
* per algorithm with an instance of a [GossipMediator]{@link module:src/controllers#GossipMediator} too.
* Additionally, events of [Peer]{@link http://peerjs.com/docs/#api} are set to receive messages of
* external peers.*/
Coordinator.prototype.bootstrap = function () {
  var c
  var self = this
  this._connectionManager = new ConnectionManager(Object.keys(this.gossipAlgos))
  this._connectionManager.on('destroy', function (peerToDel, idToDel, viewToUpd) { })
  var ss = this._signalingService
  this._bootService = new Bootstrap(this.id, ss.host, ss.port, this.profile)
  this._bootService.on('boot', function (bootstrapPeer) {
    c = self._connectionManager.newConnection(bootstrapPeer, true, self._usingSs)
    self._initConnectionEvents(c)
    self._connectionManager.setToAll(c)
  })
  this._bootService.on('offer', function (src, payload) {
    c = self._connectionManager.newConnection(src, false, self._usingSs)
    self._initConnectionEvents(c)
    self._connectionManager.setToAll(c)
    c._peer.emit('signal', payload)
  })
  this._bootService.on('answer', function (src, payload) {})
  this._bootService.on('candidate', function (src, payload) {})
  this._bootService.on('abort', function () { debug('Abort was called') })
}

Coordinator.prototype._initConnectionEvents = function(c) {
  if (!c) return
  var self = this
  c.on('open', function () {})
  c.on('sdp', function (sdp) {
    if (c._usingSigSer) {
      debug('Sending SDP through the server')
      self._bootService._signalingService.sendSDP(sdp, c._receiver)
    } else {
      // TODO
    }
  })
}
/**
* @memberof Coordinator
* @method createAlgorithms
* @description Method in charge of the initialization of objects which implements every
* gossip protocol specified in the [configuration file]{@link module:src/confObjs#configurationObj}.*/
Coordinator.prototype.createAlgorithms = function () {
  var algosNames = Object.keys(this.gossipAlgos)
  var algOpts
  var worker
  for (var i = 0; i < algosNames.length; i++) {
    debug('Trying to initialize algo with ID: ' + algosNames[i])
    algOpts = this.gossipAlgos[ algosNames[i] ]
    algOpts.data = this.profile
    this.factory.createProtocol(algosNames[i], algOpts, this.statsOpts)
    worker = this.factory.inventory[algosNames[i]]
    if (worker !== 'undefined') {
      this.setWorkerEvents(worker)
    } else {
      debug('worker: ' + algosNames[i] + ' is not defined')
    }
    if (this.statsOpts.activated) {
      this.actCycHistory[ algosNames[i] ] = {}
      this.vieUpdHistory[ algosNames[i] ] = {}
    }
  }
  debug('Initialization DONE')
  this.workers = this.factory.inventory
}
/**
* @memberof Coordinator
* @method checkConfFile
* @description The evaluation for knowing if the
* [configuration file]{@link module:src/confObjs#configurationObj} is well structured is performed
* by this method
* @param confObj Configuration object*/
Coordinator.prototype.checkConfFile = function (confObj) {
  debug('Cecking configuration file')
  try {
    var opts = confObj.signalingService
    if (!opts.hasOwnProperty('host') || !opts.hasOwnProperty('port')) {
      throw new Error('Host and/or port of signaling server is absent')
    }
    var keys = Object.keys(confObj.gossipAlgos)
    for (var i = 0; i < keys.length; i++) {
      if (!confObj.gossipAlgos[ keys[i] ].hasOwnProperty('class')) {
        throw new Error('Class name of the protocol is absent')
      }
    }
    debug('configuration file is well formed')
  } catch (e) {
    debug('Configuration file is malformed. ' + e.message)
    return
  }
  return true
}
/**
* @memberof Coordinator
* @method setWorkerEvents
* @description This method sets the event "message" of a web worker for handling any message exchange
* in WebGC. These are the possible message exchanges: i) from the Coordinator to an external peer, ii)
* from one worker to another one via the Coordinator and iii) from the Coordinator to a web application
* @param worker Reference to a [web worker]{@link http://www.w3schools.com/html/html5_webworkers.asp}*/
Coordinator.prototype.setWorkerEvents = function (worker) {
  var self = this
  worker.addEventListener('message', function (e) {
    var msg = e.data
    var worker
    switch (msg.header) {
      case 'outgoingMsg':
        debug('OutgoingMsg to reach: ' + msg.receiver + ' with algoId: ' + msg.algoId)
        self.sendTo(msg)
        break
      case 'getDep':
        worker = self.workers[msg.depId]
        if (worker !== 'undefined') {
          worker.postMessage(msg)
        } else {
          debug('there is not a worker for algorithm: ' + msg.depId)
        }
        break
      case 'setDep':
        worker = self.workers[msg.emitter]
        if (worker !== 'undefined') {
          msg.header = 'applyDep'
          worker.postMessage(msg)
        } else {
          debug('there is not a worker for algorithm: ' + msg.emitter)
        }
        break
      case 'drawGraph':
        if (typeof self.plotterObj !== 'undefined') {
          self.plotterObj.buildGraph(msg.algoId, msg.graph, msg.view)
        } else {
          debug(msg)
        }
        break
      // Logging to which extend the view of each algorithm is updated and which
      // is the overload in gossip cycles with the use of web workers
      case 'actCycLog':
        if (self.actCycHistory) {
          self.actCycHistory[msg.algoId][msg.counter] = {
            algoId: msg.algoId,
            loop: msg.loop,
            offset: msg.offset
          }
        }
        break
      case 'viewUpdsLog':
        self.vieUpdHistory[msg.trace.algoId][msg.counter] = msg.trace
        break
      case 'logInConsole':
        debug('WebGClog &&' + msg.log + '&&')
        break
      default:
        debug('message: ' + msg.header + ' is not recoginized')
        debug('message: ' + msg.header + ' is not recoginized')
        break
    }
  }, false)
  worker.addEventListener('error', function (e) {
    debug('In Worker: ' + e.message + ', lineno: ' + e.lineno)
  }, false)
}
/**
* @memberof Coordinator
* @method getViewUpdHistory
* @description Get statistics about to which extend the view of algorithms is updated
* @return Object Keys in this object correspond to the number of each gossip cycle*/
Coordinator.prototype.getViewUpdHistory = function () { return this.vieUpdHistory }
/**
* @memberof Coordinator
* @method getActiCycHistory
* @description Get statistics about to which extend the gossip cycle is updated on
* each algorithm
* @return Object Keys in this object correspond to the number each gossip cycle*/
Coordinator.prototype.getActiCycHistory = function () { return this.actCycHistory }
/**
* @memberof Coordinator
* @method emptyHistoryOfLogs
* @description Once this method is called every key of the objects "vieUpdHistory" and "actCycHistory"
* points to an empty object*/
Coordinator.prototype.emptyHistoryOfLogs = function () {
  var keys = Object.keys(this.vieUpdHistory)
  for (var i = 0; i < keys.length; i++) {
    delete this.vieUpdHistory[ keys[i] ]
    this.vieUpdHistory[ keys[i] ] = {}
  }
  keys = Object.keys(this.actCycHistory)
  for (i = 0; i < keys.length; i++) {
    delete this.actCycHistory[ keys[i] ]
    this.actCycHistory[ keys[i] ] = {}
  }
}
/**
* @memberof Coordinator
* @method sendViaSigServer
* @description Send a message to peer msg.receiver via one connection created with the help of the
* brokering server, i. e., the emitter of the message will exchange information with the receiver
* through the brokering server to perform a data connection between both peers once the connection
* is open, the message msg will be sent to the receiver.
* @param msg Payload to send
* @return connection Reference to the connection established by two peers via the brokering server*/
Coordinator.prototype.sendViaSigServer = function (msg) {
  var self = this
  // Peer.connect
  var connection = this.connect(msg.receiver, {serialization: 'json'})
  connection.on('open', function () {
    debug('Connection open, sending msg: ' + msg.service +
      ' to: ' + msg.receiver)
    if (!self._usingSs) {
      self.isFirstConDone = true
    }
    connection.send(msg)
    connection.on('data', function (data) { self.handleIncomingData(data) })
  })
  connection.on('error', function (e) {
    debug('Trying to connect with: ' + msg.receiver + ' ' + e)
  })
  return connection
}
/**
* @memberof Coordinator
* @method sendViaLookupService
* @description Send a message to peer msg.receiver via one connection created by the
* [LookupService]{@link module:src/services#LookupService}. Basically, msg.receiver will be found
* among the actual connections in the overlay with the forwarding of lookup messages. When the
* connection is open, the message msg will be sent to the receiver.
* @param msg Payload to send*/
Coordinator.prototype.sendViaLookupService = function (msg) {
  debug('Trying to send msg: ' + msg.service + ' to: ' + msg.receiver +
    ' with existing connections')
  if (!this.isFirstConDone) {
    debug('Doing first connection via the signaling server')
    this.sendViaSigServer(msg)
    return
  } else {
    var connections = this.connections[msg.receiver]
    var con
    if (connections) {
      debug('Peer.connections is not empty, searching at least one connection open')
      for (var i = 0; i < connections.length; i++) {
        con = connections[i]
        if (con) {
          debug('Connection with: ' + msg.receiver + ' at Peer was found')
          if (con.open) {
            debug('Sending message')
            con.send(msg)
            return
          } else {
            debug('Connection in Peer is still not ready')
          }
        }
      }
    }
    debug('Any connection available at Peer, checking LookupService')
    con = this.lookupService.connections[msg.receiver]
    if (con) {
      debug('Connection with: ' + msg.receiver + ' at LookupService was found')
      if (con.open) {
        debug('Sending message')
        con.send(msg)
        return
      } else {
        debug('Connection in LookupService is still not ready')
      }
    } else {
      debug('Any connection available at Lookup, doing lookup service')
    }
    this.lookupService.apply(msg)
  }
}
/**
* @memberof Coordinator
* @method handleConnection
* @description Once one connection is established among two peers this method is called
* to set the events to trigger in case of error in the connection, data
* reception and when the connection is ready to send messages. Additionally, when the
* connection is open and if the function "appFn" was set then that function is
* called.
* @param connection Connection among two peers*/
Coordinator.prototype.handleConnection = function (connection) {
  var self = this
  if (connection.label === 'chat' && this.appFn) {
    connection.on('open', function () {
      if (self.appFn !== null) {
        self.appFn(connection)
      }
    })
  } else {
    if (!this.isFirstConDone) {
      this.isFirstConDone = true
    }
    connection.on('open', function () {
      debug('Bi-directional communication with: ' + connection.peer + ' is ready')
      connection.on('data', function (data) { self.handleIncomingData(data) })
    })
    connection.on('error', function (err) {
      debug('In communication with: ' + connection.peer +
        ' (call handleConnection) ' + err)
    })
  }
}
/**
* @memberof Coordinator
* @method handleIncomingData
* @description Every message received by peers contains one header to differentiate its payload,
* this method handles the reception of messages according to the next two headers: gossip and
* lookup. The latter serves to discover peers in the overlay and the former contains what it is
* exchanged by each gossip protocol (normally, the view of each peer).
* @param data Message exchange between two peers*/
Coordinator.prototype.handleIncomingData = function (data) {
  debug(data)
  switch (data.service) {
    case 'LOOKUP':
      this.lookupService.dispatch(data)
      break
    case 'GOSSIP':
      var worker = this.workers[data.algoId]
      var msg = {
        header: 'incomingMsg',
        payload: data.payload,
        receptionTime: new Date()
      }
      worker.postMessage(msg)
      break
    case 'VOID':
      debug('VOID was received from: ' + data.emitter)
      break
    default:
      debug(data + ' is not recognized')
      break
  }
}
/**
* @memberof Coordinator
* @method setApplicationLevelFunction
* @description This method sets one function external to WebGC that normally belongs to the
* application layer.
* @param fn Reference to an external function*/
Coordinator.prototype.setApplicationLevelFunction = function (fn) { this.appFn = fn }

module.exports = Coordinator
