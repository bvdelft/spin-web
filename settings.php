<?php

/* global settings. */
$SETTINGS = array();

// Although we try to remove the files placed in these folders automatically
// they do sporadically remain so it is recommended to have a cron job running
// that each night cleans out these folders.

// All directories should be writeable by the apache unix user.

// Directory where uploaded files will appear.// You might
$SETTINGS["upload_dir"] = "/home/bart/Projecten/nowplease/spin/tmp/";

// Directory in which we create several sub-dirs spinfolder_[random] for each
// model check request. 
$SETTINGS["spin_tmp_dir"] = "/home/bart/Projecten/nowplease/spin/tmp/";

// Full path to spin executable
$SETTINGS["spin_exec"] = "/scratch/Spin/Src6.3.2/spin";

?>
