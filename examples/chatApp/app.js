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
  var numTop = {}
  for(var i = 0; i < topics.length; i++) numTop[ topics[i] ] = i + 0.1
  function addOneChatBox (peerId) {
    var chatbox, header, input
    chatbox = $('<div></div>')
      .addClass('connection')
      .addClass('active')
      .attr('id', peerId)
    header = $('<label></label>').html('Chat with <strong>' + peerId + '</strong>')
    input = $('<div></div>')
      .addClass('conInput')
      .addClass('active')
    input.append($('<textarea></textarea>')
      .addClass('textarea')
      .attr('id', 'textArea' + peerId))
    input.append($('<button>Send</button>')
      .addClass('chatButton')
      .attr('onclick', "sendMessageFromChatbox('" + peerId + "')"))
    chatbox.append(header)
    chatbox.append(input)
    chatbox.append('<h1></h1>')
    chatbox.append('<h1></h1>')
    $('#connections').append(chatbox)
  }
  function addChatBoxes (neighbours) {
    document.getElementById('chat').removeChild(document.getElementById('connections'))
    $('#chat').append($('<div></div>').attr('id', 'connections'))
    for (var i = 0; i < neighbours.length; i++) addOneChatBox(neighbours[i])
  }
  function sendMessageFromChatbox (peerId) {
    var txtArea = document.getElementById('textArea' + peerId)
    var msg = '' + txtArea.value
    if (msg || msg !== '') {
      mainObjs.coordi.protocols.vicinity1.sendTo(peerId, msg)
      if ($('#' + peerId)) $('#' + peerId).append('<div><span class="you">You: </span>' + msg + '</div>')
    }
    txtArea.value = ''
  }
  function resetProfile () {
    if (listIndex !== 0) {
      var topics = document.getElementById('topicsSection')
      for (var i = 0; i < listIndex; i++) topics.removeChild(document.getElementById('list' + i))
      listIndex = 0
    }
    var msg = 'Your profile was reseted. Please, chose other subjects of your interest and ' +
      'click on the button <<Update Profile>>'
    alert(msg)
  }
  function updateProfile () {
    if (listIndex == 0) alert("Your profile can't be empty")
    else {
      var profile = []
      for (var i = 0; i < listIndex; i++) profile.push(document.getElementById('list' + i).value)
      mainObjs.coordi.updateProfile(profile)
    }
  }
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
    document.getElementById('updateProfile').disabled = false
    var profile = []
    var element
    for (var i = 0; i < listIndex; i++) {
      element = document.getElementById('list' + i)
      profile.push(numTop[ element.options[element.selectedIndex].text ])
    }
    var coordi = new Coordinator(configurationObj, peerId, profile)
    mainObjs['coordi'] = coordi
    coordi.on('msgReception', function (emitter, data) {
      if (!$('#' + emitter)) addOneChatBox(emitter)
      $('#' + emitter).append('<div><span class="peer">' + emitter + ': </span>' + data + '</div>')
    })
    coordi.on('neighbourhood', function (neighbours, algoId, loop) {
      if (neighbours.length !== 0) {
        var container = algoId === 'cyclon1' ? 'rpsGraph' : 'clusteringGraph'
        mainObjs.plotter.buildGraph(container, mainObjs.overlay, neighbours, loop)
        if (!mainObjs.firstCall) {
          $('#waitMsg').hide()
          clearInterval(itPool)
          mainObjs.firstCall = true
          $('.filler').hide()
        }
        if (algoId !== 'cyclon1') addChatBoxes(neighbours)
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
    window.setInterval(function () { getPeersInOverlay() }, minPeriod)
    window.setInterval(function () {
      mainObjs.coordi.protocols.cyclon1.getNeighbourhood()
    }, cycPeriod + 1000)
    window.setTimeout(function () {
      mainObjs.coordi.protocols.vicinity1.getNeighbourhood()
    }, minPeriod + 1000)
    window.setInterval(function () {
      mainObjs.coordi.protocols.vicinity1.getNeighbourhood()
    }, vicPeriod + 1000)
  }
  function start () {
    var peerId = document.getElementById('user').value
    if (peerId && peerId !== '' && listIndex !== 0) isPeeridValid(peerId)
    else alert("Your peer ID and profile cantn't be empty")
  }
  document.addEventListener('DOMContentLoaded', function (event) {
    console.log('Page was loaded')
    document.getElementById('updateProfile').disabled = true
    $('#user').focus()
    $('#waitMsg').hide()
  })
  exports.start = start
  exports.addTopicList = addTopicList
  exports.launchPeer = launchPeer
  exports.resetProfile = resetProfile
  exports.updateProfile = updateProfile
  exports.sendMessageFromChatbox = sendMessageFromChatbox
})(this)
