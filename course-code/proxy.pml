/***
 * GLOBAL SETUP
 ***/

#define M 3 /* number of clients */
#define S 4 /* number of servers */
#define N 2 /* number of proxy sockets */

mtype {data0, data1, data2 , data3}; /* Possible server payloads */
mtype payload [4];                   /* Which server hosts which payload */

chan local_network = [0] of {   /* Client-Proxy communication */
  byte, /* client_id  */
  byte, /* server_id  */
  chan  /* reply chan */
};

chan global_network = [1] of {  /* Proxy-Server communication */
  byte, /* server_id  */
  chan  /* reply chan */
};

/***
 * CLIENT
 ***/
proctype client(byte id) {
  mtype data_received;              /* data received */  
  chan callback = [0] of { mtype }; /* local callback channel */

  /* Randomly select server */
  byte server_asked;                /* ID of the server to be asked */
  ... TODO ...

  printf("Client%d requesting Server%d\n", id, server_asked); 
  local_network ! id , server_asked, callback ;  
  callback ? data_received;
  
  printf("Client%d got the answer %e\n", id, data_received);
}

/***
 * SERVER
 ***/
proctype server(byte  id) {
  chan reply;
end:
  do    
  :: global_network ?? eval(id), reply; 
       printf ("Server%d working\n", id );
       reply ! (payload[id]); 
  od;
}

/***
 * PROXY
 ***/
active proctype proxy() {
    
  mtype client_id; /* ID of the client making request */
  mtype server_id; /* ID of server requested by client */
  chan  client_ch; /* Callback channel for client */
  mtype data;      /* Payload received from server */
    
  chan socket   [N] = [0] of {mtype}; /* Socket receiving server response */
  bool available[N] = true;           /* Not waiting for server response? */
  chan replies  [N];                  /* Relating sockets to client callbacks */
  
  byte i; /* For looping over sockets */
  
end:
  do
  
  /* Receive a request from a client */
  :: local_network ? (client_id, server_id, client_ch) ->

     printf("Proxy a request from Client%d to Server%d\n", client_id, server_id);
     
     i = 0; /* Loop to find available socket */
     do
     :: i < N ->
          if 
          :: available[i] ->
               available[i] = false;
               /* make a request */
               replies[i] = client_ch;
               printf ("Proxy asking Server%d \n", server_id);
               global_network ! server_id, socket[i];
               break;
          :: else -> 
               i++;
          fi 
     :: else -> /* Wait for a socket to become available */  
          if    /* .. 'abusing' that we know number of sockets */
          :: socket[0] ? data ->
               replies  [0] ! data;
               available[0] = true;
          :: socket[1] ? data ->
               replies  [1] ! data;
               available[1] = true;
          fi;
          i = 0; /* Restart search */
     od;
     
  /* Receive a response from a server */
  :: socket[0] ? (data) ->
       replies  [0] ! data;
       available[0] = true;
  :: socket[1] ? (data) ->
       replies  [1] ! data;
       available[1] = true;
  od;
  
}

/***
 * INIT
 ***/
init {
  printf ("init\n");
  /* check params */
  S >= 4;
  N >= 2;

  /* Assign payloads */
  payload[0] = data0;
  payload[1] = data1;
  payload[2] = data2;
  payload[3] = data3;
  
  byte i = 0; /* initialize the servers */
  do 
  :: i >= S -> break;
  :: else   -> run server(i); i++;
  od;
  
  i = 0;      /* initialize the clients */  
  do 
  :: i >= M -> break;
  :: else   -> run client (i); i++
  od; 
}