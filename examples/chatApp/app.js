(function (exports) {
  var $ = exports.$
  var configurationObj = exports.configurationObj
  var alert = exports.alert
  var XMLHttpRequest = exports.XMLHttpRequest
  var Coordinator = exports.Coordinator
  var Plotter = exports.Plotter
  var mainObjs = {}
  var listIndex = 0
  var topics = [
    'Internet of Things', 'P2P Systems', 'Cloud Computing', 'Big Data',
    'Gossiping', 'Optimization', 'Recommendation Systems'
  ]
  // function writeDownInChat (msg) {
  //   if (document.getElementById(msg.emitter)) {
  //     $('#' + msg.emitter + '_msgs').append(
  //       $('<div><span class="peer">' + msg.emitter + ': </span>' + msg.payload + '</div>')
  //     )
  //   } else addChatElement(msg.emitter, msg.payload, false)
  // }
  // function sendInChat () {
  //   var activeCons = $('.active')
  //   activeCons.each(function () {
  //     var peerId = $(this).attr('id')
  //     var txt = document.getElementById('text').value
  //     var cons = mainObjs['controller'].connections[peerId]
  //     for (var i = 0; i < cons.length; i++) {
  //       if (cons[i].label === 'chat') {
  //         cons[i].send({msg: txt})
  //         $('#' + peerId).append('<div><span class="you">You: </span>' + txt + '</div>')
  //         break
  //       }
  //     }
  //   })
  //   $('#text').val('')
  //   $('#text').focus()
  // }
  function addTopicList () {
    if (listIndex === topics.length) {
      alert('You can not chose another list, please, continue typing you peer ID')
      return
    }
    var list = $('<select></select>').attr('id', 'list' + listIndex)
    var listItem
    for (var i = 0; i < topics.length; i++) {
      listItem = $('<option>' + topics[i] + '</option>').attr('value', 'v' + i)
      list.append(listItem)
    }
    $('#topicsSection').append(list)
    listIndex++
  }
  // function setObjsChatCo (c) {
  //   var chatbox = $('<div></div>').addClass('connection').attr('id', c.peer)
  //   var header = $('<h1></h1>').html('Chat with <strong>' + c.peer + '</strong>')
  //   var messages = $('<div><em>Peer connected.</em></div>').addClass('messages')
  //   chatbox.append(header)
  //   chatbox.append(messages)
  //   chatbox.on('click', function () {
  //     if ($(this).attr('class').indexOf('active') === -1) $(this).addClass('active')
  //     else $(this).removeClass('active')
  //   })
  //   $('.filler').hide()
  //   $('#connections').append(chatbox)
  //   c.on('data', function (data) {
  //     console.info('MsgFromChatCon')
  //     console.info(data)
  //     $('#' + c.peer).append('<div><span class="peer">' + c.peer + '</span>: ' + data.msg + '</div>')
  //   })
  //   c.on('error', function (e) {
  //     console.log('In chat connection with: ' + c.peer)
  //   })
  // }
  function getPeersInOverlay () {
    var host = configurationObj.signalingService.host
    var port = configurationObj.signalingService.port
    var http = new XMLHttpRequest()
    var url = 'http://' + host + ':' + port + '/getGraph'
    http.open('get', url, true)
    http.onerror = function (e) { console.log('ERROR: While trying to get peers in overlay') }
    http.onreadystatechange = function () {
      if (http.readyState !== 4) return
      if (http.status !== 200) {
        http.onerror()
        return
      }
      console.log('PEERS IN OVERLAY: ' + http.responseText)
      mainObjs.overlay = JSON.parse(http.responseText)
    }
    http.send(null)
  }
  function postKeepAlive () {
    var host = configurationObj.signalingService.host
    var port = configurationObj.signalingService.port
    var url = 'http://' + host + ':' + port + '/keepAlive'
    var xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)
    xhr.setRequestHeader('Content-type', 'text/plain')
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return
      if (xhr.status !== 200) {
        xhr.onerror()
        return
      }
      var res = JSON.parse(xhr.responseText)
      if (res.success) console.log('Keep alive was posted')
      else console.log('Keep alive was not received by the server')
    }
    xhr.onerror = function () { console.log('ERROR: While posting keep alive msg') }
    xhr.send(JSON.stringify({ id: mainObjs.peerId }))
  }
  function isPeeridValid (peerId) {
    var host = configurationObj.signalingService.host
    var port = configurationObj.signalingService.port
    var url = 'http://' + host + ':' + port + '/checkPeerId'
    var xhr = new XMLHttpRequest()
    var self = this
    xhr.open('POST', url, true)
    xhr.setRequestHeader('Content-type', 'text/plain')
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return
      if (xhr.status !== 200) {
        xhr.onerror()
        return
      }
      console.log('IsPeerValid ? ' + xhr.responseText)
      var res = JSON.parse(xhr.responseText)
      if (!res.answer) self.launchPeer(peerId, host, port)
      else {
        alert('The peerId you typed was already taken, please give another one')
        $('#user').val('')
        $('#user').focus()
      }
    }
    xhr.onerror = function () { console.log('ERROR: While checking if peerId is valid') }
    var msg = { id: peerId }
    xhr.send(JSON.stringify(msg))
  }
  function launchPeer (peerId, host, port) {
    mainObjs['peerId'] = peerId
    mainObjs.firstCall = false
    document.getElementById('start').disabled = true
    var profile = []
    for (var i = 0; i < listIndex; i++) profile.push(document.getElementById('list' + i).value)
    var coordi = new Coordinator(configurationObj, peerId, profile)
    mainObjs['coordi'] = coordi
    coordi.on('msgReception', function (emitter, data) {
      // TODO print the message in the chat box of the emitter
    })
    coordi.on('neighbourhood', function (neighbours, algoId) {
      if (neighbours.length !== 0) {
        var container = algoId === 'cyclon1' ? 'rpsGraph' : 'clusteringGraph'
        mainObjs.plotter.buildGraph(container, mainObjs.overlay, neighbours)
        if (!mainObjs.firstCall) {
          $('#waitMsg').hide()
          clearInterval(itPool)
          mainObjs.firstCall = true
        }
      }
    })
    coordi.bootstrap()
    window.setInterval(function () { postKeepAlive() }, 4000)
    mainObjs.plotter = new Plotter(peerId)
    var itC = 1
    var itPool = window.setInterval(function () {
      if (itC % 2 === 0) $('#waitMsg').hide()
      else $('#waitMsg').show()
      itC++
    }, 1000)
    var cycPeriod = configurationObj.gossipAlgos.cyclon1.gossipPeriod
    var vicPeriod = configurationObj.gossipAlgos.vicinity1.gossipPeriod
    var minPeriod = Math.min(cycPeriod, vicPeriod)
    var minPeriod = cycPeriod
    window.setInterval(function () { getPeersInOverlay() }, minPeriod)
    window.setInterval(function () {
      mainObjs.coordi.protocols.cyclon1.getNeighbourhood()
    }, cycPeriod + 1000)
    window.setInterval(function () {
      mainObjs.coordi.protocols.vicinity1.getNeighbourhood()
    }, vicPeriod + 1000)
  }
  function start () {
    var peerId = document.getElementById('user').value
    if (peerId && peerId !== '') isPeeridValid(peerId)
    else alert('Your PeerID could not be empty')
  }
  document.addEventListener('DOMContentLoaded', function (event) {
    console.log('Page was loaded')
    $('#user').focus()
    $('#waitMsg').hide()
  })
  exports.start = start
  exports.addTopicList = addTopicList
  exports.launchPeer = launchPeer
})(this)
