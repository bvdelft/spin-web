/*
  It is a bit unfortunate that everything is in a single JS file, I realise.
  By now I have gotten a bit better it and perhaps some day I might rewrite this
  system more properly. For now, this file is divided in the different
  functionalities of the system by comment blocks.
*/


/* Sections:

   - Preface
   - Layout
   - Resizing
   - Spin
   - Interactive mode
   - Highlighting
   - Tab management
   - Popups
   - Minimal interface
   - File upload
   - File saving
   - Basic editor

*/

/********************************* PREFACE ************************************/

/* For debugging and printing to the console.
   If a console does not exist, fallback to alert if specified.
*/
var alertFallback = false; // set to true to get console output as alert boxes.
if (typeof console === "undefined" || 
    typeof console.log === "undefined") {
  console = {};
  if (alertFallback) {
    console.log = function(msg) {
      alert(msg);
    };
  } else {
    console.log = function() {};
  }
}

/* Get url parameters (following the ?-part).
*/
function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,
      function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}


/* Shorthand to getElementById.
   Note that it is not exactly like the jQuery $-function, if you are familiar
   with that.
*/
function $(id) { return document.getElementById(id) };

/* Get the current browser window size.
   Used when resizing components.
*/
function wndsize() {
  var w = 0; var h = 0;
  if(!window.innerWidth){ // IE
      if(!(document.documentElement.clientWidth == 0)) { // IE in strict mode
          w = document.documentElement.clientWidth;
          h = document.documentElement.clientHeight;
      } else{ // IE in quirks mode
          w = document.body.clientWidth;
          h = document.body.clientHeight;
      }
  } else { // w3c
      w = window.innerWidth;
      h = window.innerHeight;
  }
  return {width:w,height:h};
}

/********************************** LAYOUT ************************************/

/****
 * See also style.css.
 * We keep track of the size of the control panel and the size of the other
 * components follows from that.
 ****/

var MARGIN     = 20; // Margin between panels = size of scrollbars
var PADDING    = 20; // padding of editorPaneT
var TOPBAR     = 40; // height of header bar
var TABSH      = 30; // height of the div containing the file tabs

var settingsSize;  // Stores the .width and .height of the control pane.

window.onload   = initLayout; // dirty, no other onload events can happen...
window.onresize = repaint;

var editor; // Global pointer to our editor

/* Initial set up of the interface. Creates the ACE editor and sets all sizes
   to default.
*/
function initLayout() {
  console.log('init layout');
  
  // Enable resizing
  $('horScrollT').onmousedown = resizeH;
  $('verScrollT').onmousedown = resizeV;
  $('horScrollT').onmouseup = stopDrag;
  $('verScrollT').onmouseup = stopDrag;
  
  editor = new BasicEditor($('editorPane'),$('basicPane'));
  
  editor.setTheme("ace/theme/spin");
  editor.getSession().setMode("ace/mode/promela");
  
  settingsSize = { width : 490
                 , height: 290 };
  
  editorToDefault(); // Set default text in editor
  
  $('uploadframe').onload = handleUpload;
  
  repaint();

}

/* Repaint all panels according to window size and settings (control) pane's
   size. This is a bit messy.
*/
function repaint() {  
  
  var wsize = wndsize();

  // Interface table
  var tableW = wsize.width  - MARGIN * 2;
  var tableH = wsize.height - MARGIN * 2 - TOPBAR;
  $('spinTable').style.width  = tableW + 'px';
  $('spinTable').style.height = tableH + 'px';
 
  var minimalMode = isMinimal();
 
  if (!minimalMode) 
    $('rightTD').style.width = settingsSize.width + 'px';
  
  // Editor, same for other panes if in minimal mode
  var editorWidth  = tableW - PADDING * 2;
  var editorHeight = tableH - PADDING * 2;
  if (!minimalMode) 
    editorWidth = editorWidth - settingsSize.width - MARGIN;
  $('editorPaneT').style.height = editorHeight + 'px';
  $('editorPane').style.height  = editorHeight - TABSH + 'px';
  $('editorPaneT').style.width  = editorWidth + 'px'; 
  $('editorPane').style.width   = editorWidth + 'px';
  $('filetabsPane').style.width = editorWidth + 'px';
  if (minimalMode) {
    $('settingsPaneT').style.width  = editorWidth  + 'px';
    $('settingsPaneT').style.height = editorHeight + 'px';
    $('outputPaneT').style.width  = editorWidth  + 'px';
    $('outputPaneT').style.height = editorHeight + 'px';
  }
    
  // In maximal mode use settingsSize variable to determine size of
  // control and output pane
  if (!minimalMode) {
    $('settingsPaneT').style.width  = 
        settingsSize.width  - PADDING * 2 + 'px';
    $('settingsPaneT').style.height = 
        settingsSize.height - PADDING * 2 + 'px';
    $('outputPaneT').style.width  = 
        settingsSize.width  - PADDING * 2 + 'px';
    $('outputPaneT').style.height = 
        editorHeight - settingsSize.height - MARGIN + 'px';
  }

  editor.resize();    
}

/********************************** RESIZING **********************************/

var isIE = document.all ? true : false;

/* Function for getting curren position of mouse pointer.
*/
function getPos(e) {
  var _x;
  var _y;
  if (!isIE) {
  _x = e.pageX;
  _y = e.pageY;
  }
  if (isIE) {
  _x = event.clientX + document.body.scrollLeft;
  _y = event.clientY + document.body.scrollTop;
  }
  return { x : _x, y : _y };
}

/* Stopping resizing
*/
function stopDrag(e) {
  var body = document.getElementsByTagName('body')[0];
  console.log('stopping drag');
  body.onmousemove = function(e) {};
}

/* Dragging the bar left of control panel (resizing width)
*/
function resizeH(e) {
  var body = document.getElementsByTagName('body')[0];
  if (!isIE && e == undefined) return;
  if (isIE && !event.button) return;
  var m = getPos(e).x;
  console.log('starting drag horizontal');
  body.onmousemove = function(ne) {
    var d = m - getPos(ne).x;
    settingsSize.width += d;
    repaint();
    m = getPos(ne).x;
  }
}

/* Dragging the bar right of control panel (resizing height)
*/
function resizeV(e) {
  var body = document.getElementsByTagName('body')[0];
  if (!isIE && e == undefined) return;
  if (isIE && !event.button) return;
  var m = getPos(e).y;
  console.log('starting drag vertical');
  body.onmousemove = function(ne) {
    var d = getPos(ne).y - m;
    settingsSize.height += d;
    repaint();
    m = getPos(ne).y;
  }
}

/*********************************** SPIN *************************************/
 
/* Stores the steps chosen during the interactive mode (comma-separated).
*/
interactivePath = '';
 
/* Create post-data from specified options.
*/
function options() {
  var res = '';
  res += '&g=' + ($('g').checked ? 1 : 0);
  res += '&l=' + ($('l').checked ? 1 : 0);
  res += '&p=' + ($('p').checked ? 1 : 0);
  res += '&r=' + ($('r').checked ? 1 : 0);
  res += '&s=' + ($('s').checked ? 1 : 0);
  res += '&v=' + ($('v').checked ? 1 : 0);
  res += '&u=' + ($('u').checked ? 1 : 0);
  res += '&uSteps=' + $('uSteps').value;
  res += '&t=' + ($('t').checked ? 1 : 0);
  res += '&f=' + ($('f').checked ? 1 : 0);
  res += '&ver=' + $('verifyMode').value;
  res += '&ltl=' + encodeURIComponent($('ltl').value);
  res += '&int=' + interactivePath;
  return res;
}

function sanitiseOutput(str, name) {
  str = str.replace(/myfile.pml/g,name);
  str = str.replace(/</g,'&lt;');
  return str;
}

/* Call spin and feed result to output pane
*/
function spin(mode) {

  // Ignore clicks when running.
  if (mode != 'i' && $('simB').disabled)
    return;

  if (isMinimal())  minimalOutput(); // focus to output.

  var out = $('output');
  
  if (current_tab == undefined) {
    out.innerHTML = 'No file opened.';
    return;
  }
  
  var data = encodeURIComponent(editor.getValue());
  var postString = "source=" + data + "&mode=" + mode + options();
  // console.log(postString);
  
  // Disable all buttons
  $('simB').disabled = true;
  $('verB').disabled = true;
  $('intB').disabled = true;
  
  var name = current_tab.name;
  
  var xmlhttp;
  if (window.XMLHttpRequest) xmlhttp = new XMLHttpRequest();
  else xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
  
  xmlhttp.onreadystatechange = function () {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
      var resp = JSON.parse(xmlhttp.responseText);
      for (var i = 0; i < resp.log.length; i++)
        console.log(resp.log[i]);
      if (resp.mode == 'i') {
        outputInteractive(resp.commands[0].stdout);
        simpleError(resp.commands[0].stdout);
        highlightOptions(resp.commands[0].stdout);
      } else {
        out.innerHTML = "";
        // Simply display result obtained from server.
        for (var i = 0; i < resp.commands.length; i++) {
          var c = resp.commands[i];
          out.innerHTML += "<div class=\"out_command\">"
              + c.command.replace(/myfile.pml/g,name) + "</div>";
          out.innerHTML += "<div class=\"out_std\">" + sanitiseOutput(c.stdout, name)
              + "</div>";
          out.innerHTML += "<div class=\"out_err\">" + sanitiseOutput(c.stderr, name)
              + "</div>";
          simpleError(c.stdout);
          if (c.errcode != 0) {
            var msg = "Command exited with error code " + c.errcode;
            if (c.errcode == 124) msg += ", which usually means a timeout";
            msg += ".";            
            out.innerHTML += "<div class=\"out_err\">" + msg + "</div>";
          }
        }
        // Re-enable buttons.
        $('simB').disabled = false;
        $('verB').disabled = false;
        $('intB').disabled = false;
      }
    }
  };
  xmlhttp.open("POST","spin.php",true);
  xmlhttp.setRequestHeader("Content-type",
                           "application/x-www-form-urlencoded");
  xmlhttp.send(postString);
  
  if (mode == 's') out.innerHTML = 'Running...';
  else if (mode == 'v') out.innerHTML = 'Running (can take up to 30 seconds)...';
}


/***************************** INTERACTIVE MODE *******************************/

/* When in interactive mode, parse the output and present buttons for each
   option. The server has provided a special last line listing all options.
*/
function outputInteractive(text) {
  
  // Last line is comma-separated list of options.
  var choices = text.substring(text.lastIndexOf("\n") + 1).split(",");
  var output = text.substring(0, text.lastIndexOf("\n"));
  var out = $('output');
  out.innerHTML += "<div class=\"out_std\">" + output.replace(/myfile.pml/g,name) + 
                          "</div>";
  var buttons = new Array();
  var optionsDiv = document.createElement('div');
  optionsDiv.setAttribute('class','intactOptions');
  out.appendChild(optionsDiv);
  // Create a button for each choice. On click, disable all choice buttons,
  // color the selected one, store choice for re-running interactively.
  for (var c in choices) {
    buttons[c] = document.createElement('button');
    buttons[c].innerHTML = choices[c];
    optionsDiv.appendChild(buttons[c]);
    buttons[c].onclick = function() {
      for (var b in buttons) {
        buttons[b].disabled = true;
        if (buttons[b] == this) {
          buttons[b].setAttribute('class','chosen');
          if (interactivePath.length == 0)
            interactivePath = this.innerHTML;
          else
            interactivePath += ',' + this.innerHTML;
        } else {
          buttons[b].setAttribute('class','notChosen');
        }
      }
      spin('i');
    };
  }
  // Option to cancel interactive mode.
  buttons['stop'] = document.createElement('button');
  buttons['stop'].innerHTML = 'Stop';
  optionsDiv.appendChild(buttons['stop']);
  buttons['stop'].onclick = function() {
      for (var b in buttons) {
        buttons[b].disabled = true;
        if (buttons[b] == this) {
          buttons[b].setAttribute('class','chosen');
        } else {
          buttons[b].setAttribute('class','notChosen');
        }
      }
      stopInteractive();
    };
  out.scrollTop = out.scrollHeight;
  
}

function stopInteractive() {
  $('simB').disabled = false;
  $('verB').disabled = false;
  $('intB').disabled = false;
  interactivePath = '';
}

/*
  Highlight each of the possible next lines in interactive mode.
*/
function highlightOptions(str) {

  var lines = str.split("\n");
  for (var i = 0; i < lines.length; i++)  {
    var lpos = lines[i].indexOf("choice",0);
    if (lpos > 0) {
      var lposF = lines[i].lastIndexOf(":") + 1;
      var lposT = lines[i].indexOf(" ",lposF);
      var line = lines[i].substr(lposF, (lposT - lposF));
      console.log('Line: ' + line);
      highlightLine(line - 0,'choice');
    }
  }
  
}

/******************************* HIGHLIGHTING *********************************/

/* Very simplistic error highlighting. Argument is the output of Spin which is
   parsed. Each line indicating an error is highlighted. 
   Unfortunately, spin has not a very friendly machine-output (afaik) and this
   parsing may fail for different versions of Spin...
*/
function simpleError(str) {

  clearHighlight();
  var lines = str.split("\n");
  for (var i = 0; i < lines.length; i++) 
    if (lines[i].lastIndexOf("spin:",0) == 0) {
      var err = lines[i].indexOf(", Error:");
      if (err > 0 && lines[i].indexOf('myfile.pml') > 0) {
        lines[i] = lines[i].substr(0,err)
        var pos = lines[i].lastIndexOf(":");
        if (pos > 0) 
          highlightLine(lines[i].substr(pos+1,err) - 0,'error');        
      }
    }
  
}

var hlmarkers = [];

/* Mark the requested line
*/
function highlightLine (line, lbl) {
  highlightBlock(line,0,line+1,0,lbl);
}

/* Mark the requested block
*/
function highlightBlock(rowStart, columnStart, rowEnd, columnEnd, lbl){
  var Range = ace.require('ace/range').Range;
  hlmarkers.push(editor.getSession().addMarker(
      new Range(rowStart-1, columnStart-1, rowEnd-1, columnEnd), 
          lbl, "th"));
}
/* Clear the highlighted part
*/
function clearHighlight(){
  for (var i = 0; i < hlmarkers.length; i ++)
    editor.getSession().removeMarker(hlmarkers[i]);
  hlmarkers = [];
}

/******************************* TAB MANAGEMENT *******************************/

/* This can definitely be done nicer. All tabs share the same editor, so hitting
   ctrl-Z in a new tab will bring you 'back' to the previous one. Clear 
   improvement would be for tabs to actually have their own editors.
*/


var tab_counter = 0; // number of current tabs.
var current_tab = undefined; // currently opened tab.

/* Create a Tab-object. Provide file name and initial content.
*/
function Tab(name, content) {
  this.id = 'tab' + tab_counter;
  this.content = content;
  this.name = name;
  
  tab_counter += 1;
  this.span = document.createElement('span');
  $('filetabsPane').insertBefore(this.span, $('addFile'));
  var a = document.createElement('a');
  this.span.appendChild(a);
  a.setAttribute('href','javascript:void(0)');
  a.setAttribute('onclick','openTab("' + this.id + '")');
  a.innerHTML = name;
  var img = document.createElement('img');
  img.setAttribute('src','img/close.png');
  img.setAttribute('onclick','deleteTab("' + this.id + '")');
  // bogus link for hover effect
  var ab = document.createElement('a');
  ab.setAttribute('href','javascript:void(0)');
  ab.appendChild(img);
  this.span.appendChild(ab);
  tabs[this.id] = this;
  openTab(this.id);
}

/* Currently opened tabs.
*/
var tabs = [];

/* Focus to specified tab.
*/
function openTab(tab) {
  stopInteractive();
  if (current_tab != undefined) {
    // store old content
    current_tab.content = editor.getValue();
    current_tab.span.setAttribute('class','');
  }
  console.log("opening " + tab);
  current_tab = tabs[tab];
  current_tab.span.setAttribute('class','openTab');
  editor.setValue(current_tab.content);
  editor.navigateFileStart();
  editor.setReadOnly(false);
}

/* Create a new tab with an empty file.
*/
function addTab() {
  var name = prompt("Enter file name without extension","MyFile");
  if (name!=null && name!="") {
    new Tab(name + ".pml", "");
  }
}

/* Remove a tab.
*/
function deleteTab(tab) {
  var r = confirm("Are you sure you want to delete " + 
  tabs[tab].name + "?");
  if (r) {
    tabs[tab].span.parentNode.removeChild(tabs[tab].span);
    delete tabs[tab];
    for (var i in tabs) {
      console.log(i);
      openTab(i);
      return;
    }
    editorToDefault();
  }
}

/* Display the welcome text in the editor.
*/
function editorToDefault() {
  current_tab = undefined;
  editor.setValue("/**\n *\n * To start, create a new file by "
      + "clicking the (+) button, or open a file by "
      + "\n * using the links in the top left corner.\n *\n **/");
  editor.navigateFileStart();
  editor.setReadOnly(true);
}

/* Open a file from the server. Should be accessible by the client.
*/
function openExample(source, name) {
  var xmlhttp;
  if (window.XMLHttpRequest) 
    xmlhttp = new XMLHttpRequest();
  else // code for IE6, IE5
    xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
  xmlhttp.onreadystatechange = function () {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200)
      new Tab(name, xmlhttp.responseText);
  };
  xmlhttp.open("GET",source,true);
  xmlhttp.send();
  
}

/******************************** POPUPS **************************************/

/* Easy calls for showing and hiding popups.
*/

function show(d) {
  $(d).style.display = 'block';
}

function hide(d) {
  $(d).style.display = 'none';
}

/************************** MINIMAL INTERFACE *********************************/

/* Returns true iff the interface is minimalised.
*/
function isMinimal() {
  return $('rightTD').style.display == 'none';
}

/* Check whether the user indicated that the interface should be minimalised and
   act accordingly.
*/
function updateMinimal() {
  if ($('minimal').checked) {
    var control = $('maximal_controls').removeChild($('settingsPaneT'));
    var output  = $('maximal_output').removeChild($('outputPaneT'));
    $('minimal_controls').appendChild(control);
    $('minimal_output').appendChild(output);
    hide('settingsPaneT');
    hide('outputPaneT');
    hide('rightTD');
    show('minimalControl');
  } else {
    var control = $('minimal_controls').removeChild($('settingsPaneT'));
    var output  = $('minimal_output').removeChild($('outputPaneT'));
    $('maximal_controls').appendChild(control);
    $('maximal_output').appendChild(output);
    show('editorPaneT');
    show('settingsPaneT');
    show('outputPaneT');  
    hide('minimalControl');
    $('rightTD').style.display = 'table-cell';
  }
  repaint();
}

/* Functions for displaying each of the components in minimal mode.
*/

function minimalControls() {
  hide('editorPaneT');
  show('settingsPaneT');
  hide('outputPaneT');
}

function minimalEditor() {
  show('editorPaneT');
  hide('settingsPaneT');
  hide('outputPaneT');
}

function minimalOutput() {
  hide('editorPaneT');
  hide('settingsPaneT');
  show('outputPaneT');
}

/****************************** FILE UPLOAD ***********************************/

/* Upload a local file from the user. To not change the interface as a result of
   uploading, the upload dialog is within an iframe (upload.html) with a random
   token for this upload. Every time the frame reloads (because the user started
   the upload), 'handleUpload' is called (see 'initLayout').
   'handleUpload' starts a request to upload.php for the specific random token
   which will inform this page when the upload has completed, and returns the
   content.
*/

/* When reloading the upload frame because we set a new upload page (with same
   token), the 'handleUpload' function should not do anything.
*/
var uploadReset = false;

/* Random token per client.
*/
var uploadToken = randomString(32, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
function randomString(len, chars) {
    var result = '';
    for (var i = len; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}

/* Reset the upload form for this client.
*/
function resetUploadFrame() {
  uploadReset = true; 
  $('uploadframe').src = 'upload.html?token=' + uploadToken; 
}

/* Called when upload has started and finished. Sends request to upload.php
   which responds with the content of the file if upload has been successful.
*/
function handleUpload() {
  if (uploadReset) { uploadReset = false; return; }
  
  
  var postString = "action=read&token=" + uploadToken;
  
  var xmlhttp;
  if (window.XMLHttpRequest) xmlhttp = new XMLHttpRequest();
  else xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
  
  xmlhttp.onreadystatechange = function () {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
       var resp = xmlhttp.responseText;
       var i = resp.indexOf('\n');
       if (i >= 0) {
         new Tab(resp.substring(0,i), resp.substring(i+1));
       } else {
         alert("Uploading failed!");
       }
       hide('newfile');
    }
  };
  xmlhttp.open("POST","upload.php",true);
  xmlhttp.setRequestHeader("Content-type",
                           "application/x-www-form-urlencoded");
  xmlhttp.send(postString);
}

/****************************** FILE SAVING ***********************************/

/* Enables Ctrl-S save functionality.
*/

/* Check whether ctrl is down.
*/
var isCtrl = false;
document.onkeyup=function(e){
    if(e.keyCode == 17) isCtrl=false;
}

/* When ctrl-S is pressed, get the current text in the editor and request the
   server to serve it as a file.
*/
document.onkeydown=function(e){
    if(e.keyCode == 17) isCtrl=true;
    if(e.keyCode == 83 && isCtrl == true) {
        console.log("Ctrl S pressed");
        if (current_tab == undefined) return false;
        var data = editor.getValue();
        var name = current_tab.name;
        post_to_url("save.php", {'name': name, 'data' : data}, "post");
        return false; // prevent browser's ctrl-s behaviour.
    }
}

/* Although generic, used only for file saving... Creates a bogus form and
   adds parameters as post data.
*/
function post_to_url(path, params, method) {
    method = method || "post"; 
    
    var form = document.createElement("form");
    form.setAttribute("method", method);
    form.setAttribute("action", path);

    for(var key in params) {
        if(params.hasOwnProperty(key)) {
            var hiddenField = document.createElement("input");
            hiddenField.setAttribute("type", "hidden");
            hiddenField.setAttribute("name", key);
            hiddenField.setAttribute("value", params[key]);

            form.appendChild(hiddenField);
         }
    }

    document.body.appendChild(form);
    form.submit();
}

/****************************** BASIC EDITOR **********************************/

/* Wraps the ACE editor for easy switching between basic and fancy editing.
*/

var BasicEditor = function (div, ta) {
  this.aceEditor = ace.edit(div);
  this.aceDiv = div;
  this.textarea = ta;
  this.inAceMode = true;
  this.setTheme = function (theme) {
      this.aceEditor.setTheme(theme);
    };
  this.getSession = function () {
      return this.aceEditor.getSession();
    };
  this.resize = function () {
      if (this.inAceMode) {
        this.aceEditor.resize();
      } else {
        // nothind needed
      }
    };
  this.getValue = function () {
      if (this.inAceMode) {
        return this.aceEditor.getValue();
      } else {
        return this.textarea.value;
      }
    };
  this.setValue = function (val) {
      if (this.inAceMode) {
        this.aceEditor.setValue(val);
      } else {
        this.textarea.value = val;
      }
    };
  this.navigateFileStart = function () {
      if (this.inAceMode) {
        this.aceEditor.navigateFileStart();
      } else {
        // should not be needed
      }
    };
  this.setReadOnly = function (ro) {
      if (this.inAceMode) {
        this.aceEditor.setReadOnly(ro);
      } else {
        this.textarea.disabled = ro;
      }
    };
  this.setBasic = function (b) {
    this.inAceMode = !b;
    if (this.inAceMode) {
      this.aceEditor.setValue(this.textarea.value);
      this.aceEditor.setReadOnly(this.textarea.disabled);
      this.aceDiv.style.display = 'block';
      this.textarea.style.display = 'none';
      this.navigateFileStart();  
    } else {
      this.textarea.value = this.aceEditor.getValue();
      this.textarea.disabled = this.aceEditor.getReadOnly();
      this.aceDiv.style.display = 'none';
      this.textarea.style.display = 'block';
    }
  };
}

function updateBasicEditor() {
  editor.setBasic($('basiceditor').checked);
  repaint();
}

