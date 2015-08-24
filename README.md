Creeper Launch Bar: The launcher for the rest of us
===================================================

Creeper is a launch bar, similar to Alfredapp or Synapse, made with Electron
and designed to be cross platform.

Requirements
------------

### Runtime

  * OSX or Linux
  * Electron

### Development
  
  * Electron prebuilt binary from NPM
  * Nodejs
  * Grunt

Installing
----------

Clone the repository locally then enter the directory, then from there install
grunt and attempt to build it (the build phase will fetch the dependencies
both for building as well as executing from your working copy)

    bash$ git clone https://github.com/pwhelan/creeperlaunchbar
    bash$ cd creeperlaunchbar
    bash$ npm install
    bash$ npm install -g electron-prebuilt
    bash$ grunt build

To run from there it is as simple as using the electron-shell:start grunt task:

    bash$ grunt electron-shell:start

It is also possible to use the watch task to restart electron automatically
during development.

  bash$ grunt watch

Grunt must then be left running to watch for changes and then respawn electron.

Bugs
----

Gnome Shell will some times display "Creeper is ready" instead of shifting focus
to the launch bar. Install the gnome shell extension 
https://extensions.gnome.org/extension/234/steal-my-focus/ to fix this.
