/**
 * Exercise 2
 * Is it possible that process p does not read from the channel at all?
 **/
chan com = [0] of {byte}
byte value = 0;

proctype p() {

  byte i = 0;
   
  do
  :: if 
     :: i >= 5 -> break
     :: else   -> printf("Doing something else\n");
                  i ++ 
     fi
  :: com ? value ;
     printf("p received: %d\n",value)
  od
  
}

init {
     
  atomic { 
    run p()
  }

  end:
  com ! 100;

}