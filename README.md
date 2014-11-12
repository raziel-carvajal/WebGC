# WebGC
WebGC is a gossip-based library on the top of [PeerJS](http://peerjs.com/) (this project 
offers the Peer object to enrich web browsers with peer-to-peer (P2P) communication 
capabilities through the [WebRTC API](http://www.webrtc.org/)). The objective of this 
gossip library is to provide a communication layer that operates through the 
implementation and management of gossip-based protocols. Thanks to WebGC, users can 
enrich their applications with the benefits (and constrains) of a P2P-gossip communication.

# Installation Instructions
Be sure that [NodeJS](http://nodejs.org/), [Bower](http://bower.io/), [Git](http://git-scm.com/)
 and [NPM](https://www.npmjs.org/) are installed in your machine. In order to test this 
library you must obtain the PeerJS-Server Gossip project as follows:

- Fork the project PeerJS-Server Gossip through the next command: ``` git clone               
  git+ssh://<user>@scm.gforge.inria.fr//gitroot/serverjs-gossip/serverjs-gossip.git  ```
  the ``` <user> ``` tag must be replaced with your user's name.
- Refer to the ``` serverjs-gossip/README.md ``` and follow the installations instructions.

PeerJS-Server Gossip extends [PeerServer](https://github.com/peers/peerjs-server) with a way 
to give peers a first view to bootstrap gossip algorithms. Once you are done with ServerJS-Gossip, verify that Google Chrome (at least version v31.0) is installed on your machine.

Get the PeerJS-Gossip project as follows:

- Fork the project PeerJS-Gossip with the next command: ``` git clone 
  git+ssh://<user>@scm.gforge.inria.fr//gitroot/peerjs-gossip/peerjs-gossip.git  ``` the 
  ``` <user> ``` tag must be replaced with your user's name.
- Go to the folder ```peerjs-gossip```
- Type ``` npm install ```
- Type ``` bower install ```
- You are done with the installation


# Examples
In this section you can find a set of examples that shows how WebGC copes with the different
implementations of gossip-based algorithms.

## Clustering Algorithm Example (Local test)
Refer to the README.md file in the folder ``` test/multi-protocols-test ``` in order to lunch 
an example of PeerJS-Gossip in your machine. This example will show you how a gossip-based algorithm is used
for building clusters of peers.

## Non local test
Besides the library is robust enough to lunch a test with different machines, where on each of them 
there is at least one instance of a peer using WebGC, the documentation is *work in progress*

# Code Documentation
You can find the documentation of each object in this library at the folder ```peerjs-gossip/doc ```

## Create a new documentation
This project uses [JSDoc](https://github.com/jsdoc3/jsdoc) to create the documentation of the code
found at the ```lib``` directory. In order to generate a new documentation you must install JSDoc
through [Bower](http://bower.io/). **NOTE** dependencies for development are written in the file
```bower.json``` but there is not any task for the generation at ```Gruntfile.js```