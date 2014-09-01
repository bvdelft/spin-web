<?php

  // Simply stream requested data.

  $name = $_POST['name'];
  $data = $_POST['data'];
  header('Content-type: text/plain');
  header('Content-Disposition: attachment; filename="' . $name . '"');
  echo $data;

?>
