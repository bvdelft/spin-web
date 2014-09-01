active proctype NONDET() { 
  if 
    :: true -> printf("1\n")
    :: true ; printf("2\n")
    :: printf("3\n")
  fi
}
