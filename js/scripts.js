// Copyright 2013 Shafeeq Ur Rahman
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

(function() {

//All commands go this namespace
var COMMANDS = COMMANDS || {};

COMMANDS.cat =  function(argv, cb) {
   var filenames = this._terminal.parseArgs(argv).filenames,
       stdout;

   this._terminal.scroll();
   if (!filenames.length) {
      this._terminal.returnHandler = function() {
         stdout = this.stdout();
         if (!stdout)
            return;
         stdout.innerHTML += '<br>' + stdout.innerHTML + '<br>';
         this.scroll();
         this.newStdout();
      }.bind(this._terminal);
      return;
   }
   filenames.forEach(function(filename, i) {
      var entry = this._terminal.getEntry(filename);

      if (!entry)
         this._terminal.write('cat: ' + filename + ': No such file or directory');
      else if (entry.type === 'dir')
         this._terminal.write('cat: ' + filename + ': Is a directory.');
      else
         this._terminal.write(entry.contents);
      if (i !== filenames.length - 1)
         this._terminal.write('<br>');
   }, this);
   cb();
}

COMMANDS.cd = function(argv, cb) {
   var filename = this._terminal.parseArgs(argv).filenames[0],
       entry;

   if (!filename)
      filename = '~';
   entry = this._terminal.getEntry(filename);
   if (!entry)
      this._terminal.write('bash: cd: ' + filename + ': No such file or directory');
   else if (entry.type !== 'dir')
      this._terminal.write('bash: cd: ' + filename + ': Not a directory.');
   else
      this._terminal.cwd = entry;
   cb();
}

COMMANDS.ls = function(argv, cb) {
   var result = this._terminal.parseArgs(argv),
       args = result.args,
       filename = result.filenames[0],
       entry = filename ? this._terminal.getEntry(filename) : this._terminal.cwd,
       maxLen = 0,
       writeEntry;

   writeEntry = function(e, str) {
      this.writeLink(e, str);
      if (args.indexOf('l') > -1) {
         if ('description' in e)
            this.write(' - ' + e.description);
         this.write('<br>');
      } else {
         // Make all entries the same width like real ls. End with a normal
         // space so the line breaks only after entries.
         this.write(Array(maxLen - e.name.length + 2).join('&nbsp') + ' ');
      }
   }.bind(this._terminal);

   if (!entry)
      this._terminal.write('ls: cannot access ' + filename + ': No such file or directory');
   else if (entry.type === 'dir') {
      var dirStr = this._terminal.dirString(entry);
      maxLen = entry.contents.reduce(function(prev, cur) {
         return Math.max(prev, cur.name.length);
      }, 0);

      for (var i in entry.contents) {
         var e = entry.contents[i];
         if (args.indexOf('a') > -1 || e.name[0] !== '.')
            writeEntry(e, dirStr + '/' + e.name);
      }
   } else {
      maxLen = entry.name.length;
      writeEntry(entry, filename);
   }
   cb();
}

COMMANDS.gimp = function(argv, cb) {
   var filename = this._terminal.parseArgs(argv).filenames[0],
       entry,
       imgs;

   if (!filename) {
      this._terminal.write('gimp: please specify an image file.');
      cb();
      return;
   }

   entry = this._terminal.getEntry(filename);
   if (!entry || entry.type !== 'img') {
      this._terminal.write('gimp: file ' + filename + ' is not an image file.');
   } else {
      this._terminal.write('<img src="' + entry.contents + '"/>');
      imgs = this._terminal.div.getElementsByTagName('img');
      imgs[imgs.length - 1].onload = function() {
         this.scroll();
      }.bind(this._terminal);
      if ('caption' in entry)
         this._terminal.write('<br/>' + entry.caption);
   }
   cb();
}

COMMANDS.clear = function(argv, cb) {
   this._terminal.div.innerHTML = '';
   cb();
}

COMMANDS.sudo = function(argv, cb) {
   var count = 0;
   this._terminal.returnHandler = function() {
      if (++count < 3) {
         this.write('<br/>Sorry, try again.<br/>');
         this.write('[sudo] password for ' + this.config.username + ': ');
         this.scroll();
      } else {
         this.write('<br/>sudo: 3 incorrect password attempts');
         cb();
      }
   }.bind(this._terminal);
   this._terminal.write('[sudo] password for ' + this._terminal.config.username + ': ');
   this._terminal.scroll();
}

COMMANDS.login = function(argv, cb) {
   this._terminal.returnHandler = function() {
      var username = this.stdout().innerHTML;

      this.scroll();
      if (username)
         this.config.username = username;
      this.write('<br>Password: ');
      this.scroll();
      this.returnHandler = function() { cb(); }
   }.bind(this._terminal);
   this._terminal.write('Username: ');
   this._terminal.newStdout();
   this._terminal.scroll();
}

COMMANDS.tree = function(argv, cb) {
   var term = this._terminal,
       home;

   function writeTree(dir, level) {
      dir.contents.forEach(function(entry) {
         var str = '';

         if (entry.name.startswith('.'))
            return;
         for (var i = 0; i < level; i++)
            str += '|  ';
         str += '|&mdash;&mdash;';
         term.write(str);
         term.writeLink(entry, term.dirString(dir) + '/' + entry.name);
         term.write('<br>');
         if (entry.type === 'dir')
            writeTree(entry, level + 1);
      });
   };
   home = this._terminal.getEntry('~');
   this._terminal.writeLink(home, '~');
   this._terminal.write('<br>');
   writeTree(home, 0);
   cb();
}

COMMANDS.help = function(argv, cb) {
   this._terminal.write(
       'You can navigate either by clicking on anything that ' +
       '<a href="javascript:void(0)">underlines</a> when you put your mouse ' +
       'over it, or by typing commands in the terminal. Type the name of a ' +
       '<span class="exec">link</span> to view it. Use "cd" to change into a ' +
       '<span class="dir">directory</span>, or use "ls" to list the contents ' +
       'of that directory. The contents of a <span class="text">file</span> ' +
       'can be viewed using "cat". <span class="img">Images</span> are ' +
       'displayed using "gimp".<br>');
   this._terminal.write('Commands are:<br>');
   for (var c in this._terminal.commands) {
      if (this._terminal.commands.hasOwnProperty(c) && !c.startswith('_'))
         this._terminal.write(c + '  ');
   }
   cb();
}


   var CONFIG = CONFIG || {};

   CONFIG.prompt = function(cwd, user) {
      if (user)
         return '<span class="user">' + user +
             '</span>@<span class="host">shafeeqonline.com</span>:<span class="cwd">' +
             cwd + '</span>$ ';
      return 'TerminalSite 1.0 $ ';
   };

   CONFIG.username = '';

   // Takes the path for the AJAX call as well as callback
   var loadFS = function(name, cb) {
      var ajax = new XMLHttpRequest();

      ajax.onreadystatechange = function() {
         if (ajax.readyState == 4 && ajax.status == 200)
            cb(ajax.responseText);
      };
      ajax.open('GET', name);
      ajax.send();
   };


   //Not exposed to window since it is self invoking and local
   var Terminal = {
      // Init is called which inturn will call therequired methods to begin
      init: function(config, fs, commands, cb) {
         this._queue = [];
         this._history = [];
         this._historyIndex = -1;
         this.loadConfig(config);
         if (commands)
            this.loadCommands(commands);

         if (fs)
            this.loadFS(fs, cb);
         else if (cb)
            cb();
      },


      // Loads the file system that is available
      loadFS: function(name, cb) {
         loadFS(name, function(responseText) {
            this.fs = JSON.parse(responseText);
            this._addDirs(this.fs, this.fs);
            cb();
         }.bind(this));
      },


      // Calling this method only sets the 'commands' into the scope 
      loadCommands: function(commands) {
         this.commands = commands;
         this.commands._terminal = this;
      },

      // Takes the config and sets the scope
      loadConfig: function(config) {
         this.config = config;
      },

      //Starts appending to the body/selected element then calls other methods to clear the queue
      begin: function(element) {
         
         var parentElement = element || document.body;
         this.div = document.createElement('div');
         this.div.classList.add('jsterm');
         parentElement.appendChild(this.div);

         window.onkeydown = function(e) {
            var key = (e.which) ? e.which : e.keyCode;

            if (key == 13)
               e.preventDefault();
            this._handleSpecialKey(key, e);
         }.bind(this);

         window.onkeypress = function(e) {
            this._typeKey((e.which) ? e.which : e.keyCode);
         }.bind(this);

         this.returnHandler = this._execute;
         this.cwd = this.fs;
         this._prompt();
         this._toggleBlinker(600);
         this._dequeue();
      },

      // Gets CWD by taking the object cwd from scope and matching its type with folder
      getCWD: function() {
         return this.dirString(this.cwd);
      },

      // Calls _dirNamed loops through to check active element
      dirString: function(d) {
         var dir = d,
             dirStr = '';
         while (this._dirNamed('..', dir.contents).contents !== dir.contents) {
            dirStr = '/' + dir.name + dirStr;
            dir = this._dirNamed('..', dir.contents);
         }
         return '~' + dirStr;
      },

      //Gets called when we make a call to the access the directory
      //Checks path that is folder name and returns the object of that folder
      getEntry: function(path) {
         var entry,
             parts;

         if (!path)
            return null;

         path = path.replace(/^\s+/, '').replace(/\s+$/, '');
         if (!path.length)
            return null;

         entry = this.cwd;
         if (path[0] == '~') {
            entry = this.fs;
            path = path.substring(1, path.length);
         }

         parts = path.split('/').filter(function(x) {return x;});
         for (var i = 0; i < parts.length; ++i) {
            entry = this._dirNamed(parts[i], entry.contents);
            if (!entry)
               return null;
         }

         return entry;
      },

      //Append whatever it gets to the DOM
      write: function(text) {
         var output = this.stdout();

         if (!output)
            return;
         output.innerHTML += text;
      },

      //Sets the return handler to the _execute method which is default call
      defaultReturnHandler: function() {
         this.returnHandler = this._execute;
      },

      //Writes the command at interval of 100ms by looping through the command
      typeCommand: function(command, cb) {
         var that = this;

         (function type(i) {
            if (i == command.length) {
               that._handleSpecialKey(13);
               if (cb) cb();
            } else {
               that._typeKey(command.charCodeAt(i));
               setTimeout(function() {
                  type(i + 1);
               }, 100);
            }
         })(0);
      },


      //Pushes the command into the _queue to do it initially when begin method is called
      enqueue: function(command) {
         this._queue.push(command);
         return this;
      },

      //As new commands are entered and data is appended to the DOM, offset also increases
      scroll: function() {
         window.scrollBy(0, document.body.scrollHeight);
      },

      //Check arguments that are entered with the command if it has file structure operations or other commands which staat with -
      parseArgs: function(argv) {
         var args = [],
             filenames = [],
             opts;

         for (var i = 0; i < argv.length; ++i) {
            if (argv[i].startswith('-')) {
               opts = argv[i].substring(1);
               for (var j = 0; j < opts.length; ++j)
                  args.push(opts.charAt(j));
            } else {
               filenames.push(argv[i]);
            }
         }
         return { 'filenames': filenames, 'args': args };
      },

      //When JSON says that this file is a link then we write as a href taking element type and strring to show
      writeLink: function(e, str) {
         this.write('<span class="' + e.type + '">' + this._createLink(e, str) +
             '</span>');
      },

      //Currently takes the stdout and return like a wrapper
      stdout: function() {
         return this.div.querySelector('#stdout');
      },

      // Since stdout needs to keep changing this created new and deletes the old one
      newStdout: function() {
         var stdout = this.stdout(),
             newstdout = document.createElement('span');

         this._resetID('#stdout');
         newstdout.id = 'stdout';
         stdout.parentNode.insertBefore(newstdout, stdout.nextSibling);
      },

      // Sets on click event by creating new link and what should happen when this a tag is clicked
      _createLink: function(entry, str) {
        //returns this method depending on entry type
         function typeLink(text, link) {
            return '<a href="javascript:void(0)" onclick="typeCommand(\'' +
                text + '\')">' + link + '</a>';
         };

         //checks what is entry type and calls typelink appropriately to create proper onclick method
         if (entry.type == 'dir' || entry.type == 'link') {
            return typeLink('ls -l ' + str, entry.name);
         } else if (entry.type == 'text') {
            return typeLink('cat ' + str, entry.name);
         } else if (entry.type == 'img') {
            return typeLink('gimp ' + str, entry.name);
         } else if (entry.type == 'exec') {
            return '<a href="' + entry.contents + '" target="_blank">' +
                entry.name + '</a>';
         }
      },

      //Keeps calling the method till the queue is empty
      _dequeue: function() {
         if (!this._queue.length)
            return;
          //shift() method removes the first item of an array, and returns that item
         this.typeCommand(this._queue.shift(), function() {
            this._dequeue()
         }.bind(this));
      },

      _dirNamed: function(name, dir) {
         for (var i in dir) {
            if (dir[i].name == name) {
               if (dir[i].type == 'link')
                  return dir[i].contents;
               else
                  return dir[i];
            }
         }
         return null;
      },

      _addDirs: function(curDir, parentDir) {
         curDir.contents.forEach(function(entry, i, dir) {
            if (entry.type == 'dir')
               this._addDirs(entry, curDir);
         }.bind(this));
         curDir.contents.unshift({
            'name': '..',
            'type': 'link',
            'contents': parentDir
         });
         curDir.contents.unshift({
            'name': '.',
            'type': 'link',
            'contents': curDir
         });
      },

      //Adds the blinker and removes and adds it to stdout whenever new elements have been added
      _toggleBlinker: function(timeout) {
         var blinker = this.div.querySelector('#blinker'),
             stdout;

         if (blinker) {
            blinker.parentNode.removeChild(blinker);
         } else {
            stdout = this.stdout();
            if (stdout) {
               blinker = document.createElement('span');
               blinker.id = 'blinker';
               blinker.innerHTML = '&#x2588';
               stdout.parentNode.appendChild(blinker);
            }
         }

         if (timeout) {
            setTimeout(function() {
               this._toggleBlinker(timeout);
            }.bind(this), timeout);
         }
      },

      //When stdout is removed from DOM and added again it removes the existing stdout id
      _resetID: function(query) {
         var element = this.div.querySelector(query);

         if (element)
            element.removeAttribute('id');
      },

      //Adds the div and span for a particular command
      _prompt: function() {
         var div = document.createElement('div'),
             prompt = document.createElement('span'),
             command = document.createElement('span');

         this._resetID('#currentPrompt');
         this.div.appendChild(div);

         prompt.classList.add('prompt');
         prompt.id = 'currentPrompt';
         prompt.innerHTML = this.config.prompt(this.getCWD(), this.config.username);
         div.appendChild(prompt);

         this._resetID('#stdout');
         command.classList.add('command');
         command.id = 'stdout';
         div.appendChild(command);
         this._toggleBlinker(0);
         this.scroll();
      },


      //Appends each character to the dom
      _typeKey: function(key) {
         var stdout = this.stdout();

         if (!stdout || key < 0x20 || key > 0x7E || key == 13 || key == 9)
            return;

         stdout.innerHTML += String.fromCharCode(key);
      },

      //special keys listens to enter and other new functionalities
      //Will add more of the handlers
      _handleSpecialKey: function(key, e) {
         var stdout = this.stdout(),
             parts,
             pathParts;

         if (!stdout)
            return;
         //Enter key
         if (key == 13)
            this.returnHandler(stdout.innerHTML);
         
      },

      //Makes the initial call of commands by checking if they exist and calls the prompt and calls default return handler
      _execute: function(fullCommand) {
         var output = document.createElement('div'),
             stdout = document.createElement('span'),
             parts = fullCommand.split(' ').filter(function(x) { return x; }),
             command = parts[0],
             args = parts.slice(1, parts.length),
             entry = this.getEntry(fullCommand);
         this._resetID('#stdout');
         stdout.id = 'stdout';
         output.appendChild(stdout);
         this.div.appendChild(output);

         if (command && command.length) {
            if (command in this.commands) {
               this.commands[command](args, function() {
                  this.defaultReturnHandler();
                  this._prompt();
               }.bind(this));
            } else if (entry && entry.type == 'exec') {
               window.open(entry.contents, '_blank');
               this._prompt();
            } else {
               this.write(command + ': command not found');
               this._prompt();
            }
         } else {
            this._prompt()
         }
         if (fullCommand.length)
            this._history.unshift(fullCommand);
         this._historyIndex = -1;
      }
   };

   String.prototype.startswith = function(s) {
      return this.indexOf(s) == 0;
   }

   Terminal.init(CONFIG, '/json/sample.json', COMMANDS, function() {
      Terminal.enqueue('login')
          .enqueue('shafeeq')
          .enqueue('******')
          .enqueue('cat README')
          .enqueue('help')
          .enqueue('cd projects')
          .enqueue('ls -l')
          .enqueue('cd ..')
          .enqueue('tree')
          .enqueue('ls')
          .begin();
   });

   //Since on click methods are getting called in global scope we are exposing this method globally
   window.typeCommand = function(command) {
      Terminal.typeCommand(command);
   };
})();
