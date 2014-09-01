bool b;

proctype TRUE() { 
  if
    :: b -> printf("1\n")
    :: true  -> printf("2\n")
  fi
}

proctype ELSE() {  
  if
    :: b -> printf("1\n")
    :: else  -> printf("2\n")
  fi
}
