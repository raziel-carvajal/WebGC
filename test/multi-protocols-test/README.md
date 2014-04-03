# Clustering Gossip-Based Algorithm (local test)
This document describes how to perform a test of the gossip-based algorithm Vicinity. 
Considering a network of peers, Vicinity allows searching peers with a certain degree of 
similarity in order to build clusters with them. For instance, considering a network where
each peer knows its GPS coordinates, Vicinity tries to build clusters of peers wich belongs
to the same geographical region.

Given that Vicinity requires a way for searching similar peers in a network, this protocol
runs on the top of a Random Peer Sampling (RPS) service that feeds the Vicinity layer with
random enough samples of the network. Taking into consideration the peers provided by the RPS
layer, Vicinity uses a Similarity Function (SF) for distinguish wich are the similar peers.

## Test Scenario
In this test every peer has assigned a certain preference (an integer between the set 
[0, 1, 2]) in a round robin way, additionally, two peers are considered similar if the 
difference of these two peers' preferences is near to zero. In order to avoid negative 
values, the SF first computes the difference D of two preferences and then the absolute value of D is 
calculated.

For instance, in an overlay with 15 peers one-tier of them will have the preference 0, the 
second tier the preference 1 and the last tier the preference 2. Considering one peer P with
preference 0 and taking into account that each peer can storage just four neighbors, Vicinity
is going to provide a neighborhood similar to P. Eventually (after letting the protocol to
perform some iterations), Vicinity is going to obtain the most similar neigborhood N to P which
ideally, N contains two peers with preference 0 and two peers of preference 1 (based on the
distribution of preferences for these 15 peers).

## Test Execution
The script ```peerjs-gossip/test/multi-protocols-test/multi-protocols.sh``` lunches the test scenario 
described before (see section [Test Scenario](#test-scenario)). This script is going to
open some windows of the Chrome browser and each window will be considered as one peer,
then each peer P performs the Vicinity protocol in order to find wich are the most 
similar neighboors of P. 

It is recommended to read the instruction in the ```multi-protocols.sh``` file. Here 
it is a description of its usage:

```./multi-protocols.sh <peers> <execution-time> <serverjs-gossip-dir>```

and here it is a description of each option:

- ```<peers>```: Number of peers in the test (integer)
- ```<execution-time>```: Duration (in seconds) of the test (integer)
- ```<serverjs-gossip-dir>```: Directory of the ServerJS-Gossip project

### Example of the Script Execution
Follow the next steps:

1. ```cd <PATH>/peerjs-gossip/test/vicinity-local-test```
    - Where ```<PATH>``` is the directory that contains both projects, PeerJS-Gossip and
    ServerJS-Gossip.

- ```./multi-protocols.sh 10 180 <PATH>/serverjs-gossip```

This example emulates an overlay of 10 peers, where each peer perfoms the Vicinity
protocol during 3 minutes (180 seconds) following the scenario described in section
[Test Scenario](#test-scenario). When the script finishes with its execution, the
folder ```peerjs-gossip/test/multi-protocols-test/output``` is going to contain the 
results of each peer in the ```results``` folder. In this folder of results, there
is one folder per peer containing an output file called ```log```. The log file 
contains the different neighboors that Vicinity found on each iteration.

> **NOTE:** During the execution of the script do not close any window of Chrome, because each window represents a peer.
