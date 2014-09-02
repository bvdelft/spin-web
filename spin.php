<?php
  require("functions.php");

  // Only continue if source is provided
  if (empty($_POST['source']))
    die("No source code provided");

  $tempdir = makeTempDir();
  $pmlfile = makeFile($tempdir, $_POST['source']);

  $output_object = array();
  $output_object['mode'] = $_POST['mode'];
  $output_object['commands'] = array();

  // Do requested action
  //   v - verification
  //   i - interactive
  //   s - simulation

  if ($_POST['mode'] == 'v')
    runVerification($tempdir, $pmlfile);
  else if ($_POST['mode'] == 'i')
    runInteractive($tempdir, $pmlfile);
  else
    runSimulation($tempdir, $pmlfile);

  // Remove temporary directory
  system('rm -rf ' . $tempdir);  
  
  echo json_encode($output_object);

/** Simulation **/

  function runSimulation($dir, $pmlfile) {

      global $SETTINGS;
      global $output_object;

      $cmd = 'timeout 1s ' . $SETTINGS["spin_exec"] . ' ' . simOptions() . ' ' . $pmlfile;
      
      list($stdout, $stderr, $errcode) = runAndEcho($cmd, $dir);
        
      $simrun = array();
      $simrun['command'] = '$ spin ' . simOptions() . ' myfile.pml';
      $simrun['stdout']  = str_replace($pmlfile, 'myfile.pml', $stdout);
      $simrun['stderr']  = str_replace($pmlfile, 'myfile.pml', $stderr);
      $simrun['errcode'] = $errcode;
      
      array_push($output_object['commands'], $simrun);
  }

  function simOptions() {
    $res = '';
    if ($_POST['g']) $res .= '-g ';
    if ($_POST['l']) $res .= '-l ';
    if ($_POST['p']) $res .= '-p ';
    if ($_POST['r']) $res .= '-r ';
    if ($_POST['s']) $res .= '-s ';
    if ($_POST['v']) $res .= '-v ';
    if ($_POST['u']) $res .= '-u' . intval($_POST['uSteps']) . ' ';
    return $res;
  }

/** Interactive **/

  function runInteractive($dir, $pmlfile) {

      global $SETTINGS;
      global $output_object;
      
      // Trace so far.
      $trace = preg_replace( '/[^0-9,]/', '', $_POST['int']);
      $inputs = array();
      if (!empty($trace))
        $inputs = explode(',', $trace);
        
      $descriptorspec = array(
         0 => array("pipe", "r"),  // stdin
         1 => array("pipe", "w"),  // stdout
         2 => array("pipe", "w"),  // stderr
      );

      $process = proc_open('timeout 1s ' . $SETTINGS["spin_exec"] . ' -i ' . simOptions() . ' ' . $pmlfile, 
                            $descriptorspec, $pipes, $dir, null);
      
      $newout = '';
      $choices = '';
      $n = 0;
      // already write our choices to the input stream.
      $ninp = count($inputs);
      fwrite($pipes[0], implode("\n", $inputs)); 
      fclose($pipes[0]);
      $stderr = '';
      if (is_resource($process)) {
        // cannot wait for program to terminate but need to identify when user
        // input is requested and not yet available in received trace so far.
        while ($s = fgets($pipes[1])) {
          if (preg_match('/Select\ \[([0-9]+)-([0-9]+)\]/',$s,$matches) === 1) {
            if ($n < $ninp) { // still providing input
              $n++;
              $newout = '';
              $choices = '';
            } else { // new input needed, terminate.
              // $newout = $newout . $matches[1] . "," . $matches[2];
              $newout = $newout . substr_replace($choices,'',0,1);
              $stderr = stream_get_contents($pipes[2]);
              fclose($pipes[2]);
              proc_terminate($process); // kill process
              break;                    // jump out of loop
            }
          } else {
            $newout = $newout . $s;
            if (preg_match('/choice\ ([0-9]+):\ /',$s,$matches) === 1) {
              $choices = $choices . ',' . $matches[1];
            }
          }
        }
      }
      
      $irun = array();
      $irun['stdout']  = str_replace($pmlfile, 'myfile.pml', $newout);
      $irun['stderr']  = str_replace($pmlfile, 'myfile.pml', $stderr);
      array_push($output_object['commands'], $irun);

  }

/** Verification **/

  function runVerification($dir, $pmlfile) {

      global $SETTINGS;
      global $output_object;

      // Create pan file
      list($stdout, $stderr, $errcode) =
        runAndEcho('timeout 1s ' . $SETTINGS["spin_exec"] . '  -a ' . $pmlfile, $dir);
      
      $spinrun = array();
      $spinrun['command'] = '$ spin -a myfile.pml';
      $spinrun['stdout']  = str_replace($pmlfile, 'myfile.pml', $stdout);
      $spinrun['stderr']  = str_replace($pmlfile, 'myfile.pml', $stderr);
      $spinrun['errcode'] = $errcode;      
      array_push($output_object['commands'], $spinrun);

      if ($errcode != 0) return;
            
      // Compile pan file
      $gccrun = array();
      if ($_POST['ver'] == 'safety')
        $gccrun['command'] = 'timeout 20s gcc -DSAFETY -o pan pan.c';        
      if ($_POST['ver'] == 'nonprogress')
        $gccrun['command'] = 'timeout 20s gcc -DNP -o pan pan.c';  
      if ($_POST['ver'] == 'acceptance')
        $gccrun['command'] = 'timeout 20s gcc -DNOREDUCE -DNFAIR=3 -o pan pan.c';
      list($stdout, $stderr, $errcode) = runAndEcho($gccrun['command'], $dir);
      
      $gccrun['command'] = '$ ' . substr($gccrun['command'], 12);
      $gccrun['stdout']  = str_replace($pmlfile, 'myfile.pml', $stdout);
      $gccrun['stderr']  = str_replace($pmlfile, 'myfile.pml', $stderr);
      $gccrun['errcode'] = $errcode;      
      array_push($output_object['commands'], $gccrun);
      
      if ($errcode != 0) return;
      
      $depth = "100000";
      // Run pan file
      $fairness = '';
      if ($_POST['f']) $fairness = ' -f ';
      $namedLTL = '';
      if (!empty($_POST['ltl']))
        $namedLTL = ' -N ' . preg_replace( '/[^0-9a-zA-Z_]/', '', $_POST['ltl']) . ' ';
      
      $panrun = array();
      if ($_POST['ver'] == 'safety')
        $panrun['command'] = 'timeout 30s ./pan -m'.$depth.' -X' . $namedLTL;
      if ($_POST['ver'] == 'acceptance')
        $panrun['command'] = 'timeout 30s ./pan ' . $fairness . ' -a -m'.$depth.' -X' . $namedLTL;
      if ($_POST['ver'] == 'nonprogress')
        $panrun['command'] = 'timeout 30s ./pan ' . $fairness . '  -l -m'.$depth.' -X' . $namedLTL;
      list($stdout, $stderr, $errcode) = runAndEcho($panrun['command'], $dir);
      
      $panrun['command'] = '$ ' . substr($panrun['command'], 12);
      $panrun['stdout']  = str_replace($pmlfile, 'myfile.pml', $stdout);
      $panrun['stderr']  = str_replace($pmlfile, 'myfile.pml', $stderr);
      $panrun['errcode'] = $errcode;      
      array_push($output_object['commands'], $panrun);

      if ($errcode != 0) return;
      
      // If there is a trail, run it if requested
      if(file_exists($pmlfile . '.trail') &&  $_POST['t']) {
      
        $trailrun = array();
        list($stdout, $stderr, $errcode) =
          runAndEcho('timeout 2s ' . $SETTINGS["spin_exec"] . ' ' . simOptions() . ' -t ' . $pmlfile, $dir);
      
        $trailrun['command'] = '$ spin ' . simOptions() . ' -t myfile.pml';
        $trailrun['stdout']  = str_replace($pmlfile, 'myfile.pml', $stdout);
        $trailrun['stderr']  = str_replace($pmlfile, 'myfile.pml', $stderr);
        $trailrun['errcode'] = $errcode;      
        array_push($output_object['commands'], $trailrun);
        
      }

  }

  function runAndEcho($cmd, $dir) {

      $descriptorspec = array(
         0 => array("pipe", "r"),  // stdin
         1 => array("pipe", "w"),  // stdout
         2 => array("pipe", "w"),  // stderr
      );

      $process = proc_open($cmd, $descriptorspec, $pipes, $dir, null);

      $stdout = stream_get_contents($pipes[1]);
      fclose($pipes[1]);

      $stderr = stream_get_contents($pipes[2]);
      fclose($pipes[2]);

      $errcode = proc_close($process);
      
      return array($stdout,$stderr,$errcode);
  }


?>
