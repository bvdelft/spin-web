<?php

  require("settings.php");

  /**
   * Create a temporary directory and returns the path to that directory.
   **/
  function makeTempDir() {
    global $SETTINGS;
    $tempdir = tempnam($SETTINGS["spin_tmp_dir"],'spinfolder_');
    if (file_exists($tempdir)) { unlink($tempdir); } // later one overrules.
    mkdir($tempdir);
    return $tempdir;
  }
  
  /**
   * Creates a new file in the provided directory and puts the content. Returns
   * path to that file.
   **/
  function makeFile($dir, $content) {
    $pmlfile = tempnam($dir,'pmlfile');
    $temph = fopen($pmlfile, 'w');
    fwrite($temph, $content);
    fclose($temph);
    return $pmlfile;
  }

?>
