/**
 * Exercise 3
 * Model a system having 5 clients and 2 servers where a client cannot send 
 * another request before his previous one was processed by a server. The
 * suggested solution uses buffered channels and describes the behaviour of the
 * server processes. Complete the solution for the client processes.
 **/

chan request = [2] of { byte, chan}; 
chan reply[5] = [2] of { byte };

active [2] proctype Server() { 
  byte client; 
  chan replyChannel; 

  do
     :: request ? client, replyChannel -> 
        printf("Client %d processed by server %d\n", client, _pid); 
        replyChannel ! _pid
  od
}

proctype Client(byte id) { 
  ...
}

init {
  ... // Launch 5 clients
}
