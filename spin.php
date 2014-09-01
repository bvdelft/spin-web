<?php
  require("settings.php");

// Only continue if source is provided
if (empty($_POST['source']))
  die("No source code provided");


// Create a temporary folder
$tempdir = tempnam($SETTINGS["spin_tmp_dir"],'spinfolder_');
if (file_exists($tempdir)) { unlink($tempdir); } // later one overrules.
mkdir($tempdir);

// Create promela file. Using name 'pmlfile', we later replace it in output
// to the web application with 'myfile.pml'. The web application can then use
// any name it prefers.
$pmlfile = tempnam($tempdir,'pmlfile');
$temph = fopen($pmlfile, 'w');
fwrite($temph, $_POST['source']);
fclose($temph);

// Do requested action
// v - verification
// i - interactive
// s - simulation
if ($_POST['mode'] == 'v')
  runVerification($tempdir, $pmlfile);
else if ($_POST['mode'] == 'i')
  runInteractive($tempdir, $pmlfile);
else
  runSimulation($tempdir, $pmlfile);

// Remove temporary directory
system('rm -rf ' . $tempdir);

////////////////////////////////////////////////////////////////////////////////

function runInteractive($dir, $pmlfile) {

    global $SETTINGS;
    
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
    
    echo str_replace($pmlfile, 'myfile.pml', $stderr);
    // only returning the new output, i.e. after the most recent choice.
    echo str_replace($pmlfile, 'myfile.pml', $newout);

}

function runSimulation($dir, $pmlfile) {

    global $SETTINGS;

    list($stdout, $stderr, $errcode) =
      runAndEcho('timeout 1s ' . $SETTINGS["spin_exec"] . ' ' . simOptions() .  ' ' . $pmlfile, $dir);

    echo str_replace($pmlfile, 'myfile.pml', $stdout);
    echo str_replace($pmlfile, 'myfile.pml', $stderr);

    if ($errcode != 0) {
      echo "\n";
      if ($errcode == 124)
        echo "Process timed out (time out is set to 1 second)\n" .
             "Consider setting a maximum number of steps";
      else
        echo "Process exited with error code " . $errcode;
    }

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


function runVerification($dir, $pmlfile) {

    global $SETTINGS;

    // Create pan file
    list($stdout, $stderr, $errcode) =
      runAndEcho('timeout 1s ' . $SETTINGS["spin_exec"] . '  -a ' . $pmlfile, $dir);
    
    echo str_replace($pmlfile, 'myfile.pml', $stdout);
    echo str_replace($pmlfile, 'myfile.pml', $stderr);

    if ($errcode != 0) {
      echo "\n";
      if ($errcode == 124)
        echo "Creating pan-file timed out (time out is set to 1 second)";
      else
        echo "Process exited with error code " . $errcode;
      return;
    }
    
    // Compile pan file
    if ($_POST['ver'] == 'safety')
      list($stdout, $stderr, $errcode) =
        runAndEcho('timeout 20s gcc -DSAFETY -o pan pan.c', $dir);
    if ($_POST['ver'] == 'nonprogress')
      list($stdout, $stderr, $errcode) =
        runAndEcho('timeout 20s gcc -DNP -o pan pan.c', $dir);  
    if ($_POST['ver'] == 'acceptance')
      list($stdout, $stderr, $errcode) =
        runAndEcho('timeout 20s gcc -DNOREDUCE -DNFAIR=3 -o pan pan.c', $dir);
    
    echo str_replace($pmlfile, 'myfile.pml', $stdout);
    echo str_replace($pmlfile, 'myfile.pml', $stderr);

    if ($errcode != 0) {
      echo "\n";
      if ($errcode == 124)
        echo "Compiling pan-file timed out (time out is set to 20 seconds)";
      else
        echo "Process exited with error code " . $errcode;
      return;
    }
    
    $depth = "100000";
    // Run pan file
    $fairness = '';
    if ($_POST['f']) $fairness = ' -f ';
    $namedLTL = '';
    if (!empty($_POST['ltl']))
      $namedLTL = ' -N ' . preg_replace( '/[^0-9a-zA-Z_]/', '', $_POST['ltl']) . ' ';
    if ($_POST['ver'] == 'safety')
      list($stdout, $stderr, $errcode) =
        runAndEcho('timeout 30s ./pan -m'.$depth.' -X' . $namedLTL, $dir); // No fairness here
    if ($_POST['ver'] == 'acceptance')
      list($stdout, $stderr, $errcode) =
        runAndEcho('timeout 30s ./pan ' . $fairness . ' -a -m'.$depth.' -X' . $namedLTL, $dir);
    if ($_POST['ver'] == 'nonprogress')
      list($stdout, $stderr, $errcode) =
        runAndEcho('timeout 30s ./pan ' . $fairness . '  -l -m'.$depth.' -X' . $namedLTL, $dir);
    
    echo str_replace($pmlfile, 'myfile.pml', $stdout);
    echo str_replace($pmlfile, 'myfile.pml', $stderr);

    if ($errcode != 0) {
      echo "\n";
      if ($errcode == 124)
        echo "Running pan-file timed out (time out is set to 30 seconds)";
      else
        echo "Process exited with error code " . $errcode;
      return;
    }
    
    // If there is a trail, run it if requested
    if(file_exists($pmlfile . '.trail') &&  $_POST['t']) {
      echo "\nRunning generated trail.\n";
      list($stdout, $stderr, $errcode) =
        runAndEcho('timeout 2s ' . $SETTINGS["spin_exec"] . ' ' . simOptions() . ' -t ' . $pmlfile, $dir);
    
      echo str_replace($pmlfile, 'myfile.pml', $stdout);
      echo str_replace($pmlfile, 'myfile.pml', $stderr);

      if ($errcode != 0) {
        echo "\n";
        if ($errcode == 124)
          echo "Running trail timed out (time out is set to 2 seconds)";
        else
          echo "Process exited with error code " . $errcode;
        return;
      }
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
