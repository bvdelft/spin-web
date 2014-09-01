#define N 10

active proctype ARRAY() {
  int a[N]; 
  int s = 0;
  int sum = 0;
  
  /* use Nondeterminism to fill the array with some values */
  do
    :: (s >= N) -> break
    :: else     -> if 
		     ::  a[s] = 0
		     ::  a[s] = 1
		     ::  a[s] = 2
		     ::  a[s] = 3
		     ::  a[s] = 4
		     ::  a[s] = 5
		   fi;
		   s++
  od;
  
  printf("The sum is: %d\n", sum)
}
