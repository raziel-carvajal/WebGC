# PeerJS-Gossip
PeerJS-Gossip is a gossip library on the top of PeerJS (this project offers the Peer object to enrich
web browsers with peer-to-peer communication capabilities through the WebRTC API). The objective of this 
gossip library is to provide a communication layer that operates through the implementation and management
of gossip-based protocols. Thanks to PeerJS-Gossip, users can enrich their applications with the benefits 
(and constrains) of a P2P-gossip communication layer.

# Installation Instructions
In order to test this library you must obtain the ServerJS-Gossip project as follows:


- Fork the project ServerJS-Gossip through the next command: ``` git clone               
  git+ssh://<user>@scm.gforge.inria.fr//gitroot/serverjs-gossip/serverjs-gossip.git  ```
  the ``` <user> ``` tag must be replaced with your user's name.
- Refer to the ``` serverjs-gossip/README.md ``` and follow the installations instructions.

Once you are done with ServerJS-Gossip, verify that Google Chrome (at least version v31.0) is installed
on your machine.

Get the PeerJS-Gossip project as follows:

- Fork the project PeerJS-Gossip with the next command: ``` git clone 
  git+ssh://<user>@scm.gforge.inria.fr//gitroot/peerjs-gossip/peerjs-gossip.git  ``` the 
  ``` <user> ``` tag must be replaced with your user's name.
- Go to the folder ```peerjs-gossip```
- Type ``` npm install ```
- Type ``` bower install ```
- You are done with the installation

# PeerJS-Gossip API
Users can improve their applications with the set of methods that PeerJS-Gossip offers through its objects.
Here you can find wich are the current objects (and their methods) that conform the API.

## Coordinator Object
You can find the source code of this object at ``` peerjs-gossip/lib/controllers/Coordinator.js ```

### ```getPeers()``` method
This method provides the view (neighboors of the local peer) of each active gossip-based protocol. 
The view contains a set of unique peer identifiers (strings), each idenfier represents one peer in
the network in a unique way. Identifiers allow to contact peers through the PeerJS (peer class of WebRTC)
API.

### Coordinator is a PeerJS object
The Coordinator is a sub-object of PeerJS, so, users can use the primitives ```PeerJS.send()``` and 
```PeerJS.receive()```. Refer to the PeerJS API reference for more details at 
``` http://peerjs.com/docs/#api ```

# Examples
In this section you can find a set of examples that shows how PeerJS-Gossip copes with the different
implementations of gossip-based algorithms.

## Clustering Algorithm Example
Refer to the README.md file in the folder ``` peerjs-gossip/test/multi-protocols-test ``` in order to lunch 
an example of PeerJS-Gossip in your machine. This example will show you how a gossip-based algorithm is used
for building clusters of peers.

# Code Documentation
You can find the documentation of each object in this library at the folder ```peerjs-gossip/doc ```
