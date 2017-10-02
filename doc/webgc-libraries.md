# WebGC libraries
WebGC relies on the following libraries to deal with WebRTC connections between peers hosted at NodeJS or web-browsers:

- `simple-peer` provides a Peer class to send and receive messages. The handshake protocol of WebRTC to perform data connections takes place with the creation of a new peer.

- `webworker-threads` is a multi-threading API used by peers hosted within a NodeJS process, when peers are running within a web-browser the standard WebWorker API of HTML5 is used instead.

- `wrtc` is a NodeJS library that contains the WebRTC APPI, i.e. classes RTCPeerConnection and DataChannel 