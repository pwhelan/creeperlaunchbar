Creeper Launch Bar: The launcher for the rest of us
===================================================

Creeper is a launch bar, similar to Alfredapp or Synapse, made with Atom Shell
and designed to be cross platform.

Requirements
------------

### Runtime

  * OSX or Linux
  * Atom Shell

### Development

  * Atom Shell
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
    bash$ grunt build

To run from there it is as simple as using the atom-shell:start grunt task:

    bash$ grunt atom-shell:start

It is also possible to use the watch task to restart atom shell automatically
during development.

  bash$ grunt watch

Grunt must then be left running to watch for changes and then respawn atom-shell.
