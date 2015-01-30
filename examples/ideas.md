#Using WebGC as it is (+1)
- Coordinator must be event-emitter based, i.e. the communication with gossip-based objects must be asynchronous (due to the delay for getting the result of a similarity function)
- Extend the coordinator with a queue that is going to schedule the events, in active and passive threads, of the algorithms
    - When the result of the similarity function (in web worker) is needed it is scheduled with the id of the peer for answering (in order of reception). When the computation is ready, the connection with WebRTC is performed
- it isn't required to performed too much changes

#WebGC using web workers

##Changes in the library
  1. One worker per algorithm
      - Communication between workers (via Message channels), two ways for the implementation:
        1. Synchronization is needed (semaphores)
            - views exchange
                - clustering algorithm must wait till the RPS view is ready
                - clustering algorithm must wait till the computation of SF is ready
        2. Schedule petitions using a queue
  2. All algorithms in one worker, two ways for the implementation:
    1. Synchronization is needed too just for waiting the computation of the similarity function between the main thread and the worker
    2. Schedule petitions using a queue
  3. Active and passive cycles must be synchronized too in the main thread
  4. For allowing web workers in WebGC users must lunch their browsers with the argument ```--allow-file-access-from-files``` (I have to check if it is mandatory to do that when the library is in a web server, according to some comments in the net it is not required)
  5. Make some objects of WebGC visible in workers. Two ways to maintain the code:
    - write an event-based version of the classes (that implies to maintain two codes)
    - send an object (via the message passing in workers) in the environment of the worker. It is  possible if there is a circular reference to the objects.

##What can't be changed
- Communication with others peers with WebRTC (because DOM isn't available in workers)


##Changes in architecture
- Coordinator must be abstract
    - two implementation of coordinator (with or without web workers)
- Extend the configuration object with the implementations of method compute() for each similarity function



#Ideas for improving WebGC (future)
- Use shared workers for the hole library
    - one instance of each object in WebGC for every local peer (one tab of the browser per peer)