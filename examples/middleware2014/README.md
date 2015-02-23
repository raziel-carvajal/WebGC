#Example with Vicinity
In one network of peers where each of them owns its profile, 
[Vicinity](http://dl.acm.org/citation.cfm?id=2138914) searches similar peers based 
on peers' profiles to build clusters. For instance, in a network where each
peer knows its GPS coordinates Vicinity forms clusters of peers that belongs
to the same geographical region. Peers in the network are found thanks to another 
dissemination protocol called 
[Random Peer Sampling](http://dl.acm.org/citation.cfm?id=1275520) (RPS).

##Test Scenario
Let's considered a network of N peers where each peer's profile is an integer in the 
next interval [0, 1, 2, 3], this example shows how Vicinity forms clusters with the next 
property: for every couple of peers in the cluster the difference of their profiles tends 
to zero, for avoiding negative values the absolute value of this difference is calculated.

For instance, in a set of 15 peers where one tier of them have the profile 0, the second
tier 1 and the last tier the profile 2, peer P with profile 0 can storage up to four
references to others peers; after letting Vicinity to perform some iterations the protocol
is going to obtain the most similar neighborhood N for P which ideally, N contains two 
peers with profile 0 and two peers with profile 1 (based on the profiles distribution 
for these 15 peers).

##Test Execution
The script ```launchDemo.sh``` performs the scenario described in the last section, this 
is its synopsis:

```./launchDemo.sh <peers> <execution time> <serverjs-gossip directory>```

OPTIONS

- ```<peers>```: number of peers in the test (integer)
- ```<execution time>```: Duration (in minutes) of the test (integer)
- ```<serverjs-gossip directory>```: Directory of the ServerJS-Gossip project

Once the script is lunched some windows of the Chrome browser are going to be open, each 
window represents one peer that runs two protocols, Vicinity and RPS. Additionally, there
will be one graphical representation of each algorithm where the peers and the connections
that each protocol generates are shown.

###Example of the Script Execution
Follow the next steps:

1. ```cd <PATH>/peerjs-gossip/examples/middleware2014```
    - Where ```<PATH>``` is the directory that contains both projects, PeerJS-Gossip and
    ServerJS-Gossip.

- ```./launchDemo.sh 10 5 <PATH>/serverjs-gossip```

This example emulates an overlay of 10 peers, where each peer performs the Vicinity
protocol during 5 minutes following the scenario described in section Test Scenario. 

> **NOTE:** During the execution of the script do not close any window of Chrome, otherwise
> the numbers of peers in the overlay will be reduced