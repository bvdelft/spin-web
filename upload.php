<?php
  require("settings.php");

  $token = preg_replace( '/[^0-9a-zA-Z]/', '', $_POST['token']);
  $tempfile = $SETTINGS["upload_dir"] . '/' . $token;
  
  /* A file is uploaded in one frame, read in a different one. The way to
     communicate is by a client-specific token used as the file name for the
     uploaded file.
  */
  
  // READING PHASE
  if ($_POST['action'] === 'read') {
    // Read and echo file in tmp location, if any);
    if (file_exists($tempfile)) {
      echo file_get_contents($tempfile);
      // Remove tmp file
      system('rm ' . $tempfile);
    } else {
      echo "No uploaded file found.";
    }
  }
  
  
  // UPLOAD PHASE
  if ($_POST['action'] === 'upload') {  
    if ($_FILES['promela-file']['error'] == UPLOAD_ERR_OK           // checks for errors
        && is_uploaded_file($_FILES['promela-file']['tmp_name'])) { // checks that file is uploaded
        
      $filename = basename($_FILES['promela-file']['name']);
      // Store file in tmp location 
      $temph = fopen($tempfile, 'w');
      fwrite($temph, $filename . "\n");
      fwrite($temph, file_get_contents($_FILES['promela-file']['tmp_name']));
      fclose($temph);
      echo "Done uploading.";
    } else {
      echo "File not uploaded successfully (too large?)";
    }
  }
  
?>
