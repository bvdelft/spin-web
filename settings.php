<?php

/* global settings. */
$SETTINGS = array();

// Although we try to remove the files placed in these folders automatically
// they do sporadically remain so it is recommended to have a cron job running
// that each night cleans out these folders.

// All directories should be writeable by the apache unix user.

// Directory where uploaded files will appear.
$SETTINGS["upload_dir"] = "/scratch/spintmp/";

// Directory in which we create several sub-dirs spinfolder_[random] for each
// model check request. If the directory does not exist or is not accessible,
// the system's default temporary directory will be used.
$SETTINGS["spin_tmp_dir"] = "/scratch/spintmp/";

// Full path to spin executable
$SETTINGS["spin_exec"] = "/scratch/spin/spin";

?>
