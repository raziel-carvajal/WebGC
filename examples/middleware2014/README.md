#Example with Vicinity
In one network of peers where each of them owns its profile, 
[Vicinity](http://dl.acm.org/citation.cfm?id=2138914) searches similar peers based 
on peers' profiles to build clusters. For instance, in a network where each
peer knows its GPS coordinates Vicinity forms clusters of peers that belongs
to the same geographical region. Peers in the network are found thanks to another 
dissemination protocol called 
[Random Peer Sampling](http://dl.acm.org/citation.cfm?id=1275520).

## Test Scenario
Taking into account N peers where each peer's profile is an integer in the 
interval [0, 1, 2, 3], this example shows how Vicinity forms clusters with peers 
that have the same number or 




In this example the profile of each peer is an integer in the interval [0,1,2,3] that is assigned in a round 


 is an integer in the next interval  
[0, 1, 2, 3] in a round robin way, additionally, two peers are considered similar if the 
difference of these two peers' preferences is near to zero. In order to avoid negative 
values, the SF first computes the difference D of two preferences and then the absolute value of D is 
calculated.

For instance, in an overlay with 15 peers one-tier of them will have the preference 0, the 
second tier the preference 1 and the last tier the preference 2. Considering one peer P with
preference 0 and taking into account that each peer can storage just four neighbors, Vicinity
is going to provide a neighborhood similar to P. Eventually (after letting the protocol to
perform some iterations), Vicinity is going to obtain the most similar neighborhood N to P which
ideally, N contains two peers with preference 0 and two peers of preference 1 (based on the
distribution of preferences for these 15 peers).

## Test Execution
The script ```test/multi-protocols-test/multi-protocols.sh``` lunches the test scenario 
described before (see section Test Scenario). This script is going to
open some windows of the Chrome browser and each window will be considered as one peer,
then each peer P performs the Vicinity protocol in order to find which are the most 
similar neighbors of P. 

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
Test Scenario. When the script finishes with its execution, the
folder ```peerjs-gossip/test/multi-protocols-test/output``` is going to contain the 
results of each peer in the ```results``` folder. In this folder of results, there
is one folder per peer containing an output file called ```log```. The log file 
contains the different neighbors that Vicinity found on each iteration.

In the file ```peerjs-gossip/test/multi-protocols-test/multi-protocol.html``` you can
find an instance of the Coordinator object which orchestrate the protocols for having the
clustering example.

> **NOTE:** During the execution of the script do not close any window of Chrome, because each window represents a peer.

## Visualization of the overlay
If you want to see the hole overlay, there is another instance of Chrome named Plotter which 
periodically (due to the cycles of the gossip algorithms) builds a graph that represent the 
overlay of peers. In the graph there is a focus in one peer, meaning that there is an emphasis in
how the neighbors of that peer change; besides, the connections for every peer is shown. This 
plotter is a peer PeerJS too, so the neighbors of each peer in the overlay are using WebRTC.

## References
[Vicinity](http://dl.acm.org/citation.cfm?id=2138914) "Epidemic-Style management of semantic overlays for content based searching"

[RPS](http://dl.acm.org/citation.cfm?id=1275520) "Gossip-based peer sampling"