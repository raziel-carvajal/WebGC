#Example of Random Peer Sampling protocol
This example shows how the Cyclon protocol works in WebGC to feed peers with a random sampling of the P2P overlay. Please, follow the next steps: 

- **Launch the server**
    - Go to directory ```examples``` of the project ```serverjs-gossip```
    - Start the server with this command: ```DEBUG=* node launch.js <port>``` where ```<port>``` is the port number the server listens
        - You can use the port number ```9990```, which is the default port number peers use to contact the server

- **Launch the clients** 
    - Go to directory ```examples/simpleRpsProtocol``` of the project ```peerjs-gossip```
    - If the server listens on port ```9990``` and you pretend to launch peers in the host where the server runs, just open the file ```index.html``` with your web browser. This example is compatible with Chrome (version 45 or plus) and Firefox (version 40 or plus)
    - If the server runs in a different ```<host>``` and ```<port>```, before opening the HTML file, edit the ```index.html``` file with the host and port number in the property ```signalingService``` as it is shown here:


          ```...```

          ```signalingService: {```

           ```host: "<host>",```

          ```port: <port>```

          ```},```

          ```...```

    - You have to open at least two times the ```index.html``` file to see how data is exchange by  peers (one peer runs on each HTML file)

##Data visualization
Peers in Cyclon exchange periodically one subset of their neighbors, which it is chosen in a randomly way. To see these exchanges, open the web console on each browser tab (you can open the console in Chrome with ```Ctrl+ALT+J``` and in Firefox with ```Ctrl+ALT+K```. Periodically, the current neighbors of each peer will appear in the web console; this is an example of the log that you will see:

```VIEW: {```

```"loop":3,```
    
```"algoId":"cyclon1",```

```"view":"{```

```\"04c4d1df67ab746b566a6fcd0b7f8ff4\":{\"age\":1,\"data\":\"EMPTY\"```

```\"ca7e7b5749974146b130d16102e163c5\":{\"age\":1,\"data\":\"EMPTY\"} }"```

```}```

The neighbors are described in the ```view``` object where each property represents the peer ID of one neighbor (as you can see this ID is a random string). In this example, each peer can contain at most 5 neighbors which means that if you want to see how neighbors change, it is required to have at least 6 peers running (in other words, to open the ```index.html`` file at least 6 times).

##WebGC API
These are some properties and methods WebGC provides to get information about the gossip protocols running on each peer. In our example, WebGC clients are stored in the variable ```coordinator``` which it is reachable from the web console.

- Property ```protocols```. This property gets you access to the instances of gossip protocols running on each client. For instance, if you want to have access to the instance of Cyclon running on this example you have to type ```coordinator.protocols.cyclon1```

- Method ```protocols.<gossipAlgoID>.getNeighbourhood()```. Gets an array with the current neighbors. Example: the call ```coordinator.protocols.cyclon1.getNeighbourhood()``` will get the next output 

```Get neighbourhood request was sent to thread: cyclon1```

```Neighbourhood of thread cyclon1: 129a06b4b012303ec950f450e51e485b,27334a8a9065fd677fd26e86a4e9ada1```

- Method ```protocols.<gossipAlgoID>.setNeighbourhoodSize(newSize)```. Change the size of the neighborhood. Example: ```coordinator.protocols.cyclon1.setNeighbourhoodSize(8)```

- Method ```protocols.<gossipAlgoID>.sendTo(neighbor, msg)```. Send ```neighbor``` the message ```msg```. Example: the call ```coordinator.protocols.cyclon1.sendTo("129a06b4b012303ec950f450e51e485b", "WHAT'S UP!")``` will send a message to peer ```129a06b4b012303ec950f450e51e485b```, the later is going to print as output: ```Message: WHAT'S UP! received from: 6159ec1a5058dc7e2e85e64e1fb74a3b```

- Method ```protocols.<gossipAlgoID>.sendToNeighbours(msg)```. Send the message ```msg``` to all neighbors. Example: ```coordinator.protocols.cyclon1.sendToNeighbours("HELLO TO ALL!")```

- Method ```updateProfile(newProfile)```. Every peer keeps a profile (data structure) to describe the local peer in a generic way, this profile could be used for any gossip algorithm (in a clustering protocol for example, to find other peers with similar profiles) or for the application layer. Example: when the peer ```6159ec1a5058dc7e2e85e64e1fb74a3b``` performs the call ```coordinator.updateProfile({name: 'Bob', mail: 'boby@bob.me'})``` its neighbors prints the next log:

```VIEW: {```

```"loop":1262,```

```"algoId":"cyclon1",```

```"view":"{\```

```"6159ec1a5058dc7e2e85e64e1fb74a3b\":{\"age\":1,\"data\":{\"name\":\"Bob\",\"mail\":\"boby@bob.me\"}},```

```\"129a06b4b012303ec950f450e51e485b\":{\"age\":1,\"data\":\"EMPTY\"}}"```

```}```