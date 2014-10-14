Creeper: The creepy launch bar!
===============================

This is a Launch bar for Linux and OSX similar to Alfredapp or Synapse. It
strives to be consistent across platforms and as convenient and powerful as
possible.

This magic is all possible using the new Atom Shell, which brings a
consistent and easy to use environment for making desktop html5 apps.

Requirements
------------

  * npm: platform dependent
  * grunt: http://gruntjs.com/getting-started
  * atom-shell: we'll install this later with grunt, don't worry ;)

Installing
----------

The only way to install it now is by hand via git:

    user@host:~$ git clone http://github.com/pwhelan/creeperlaunchbar
    user@host:~$ cd creeperlaunchbar

Now to install the dependencies (make sure you have the grunt cli):

    user@host:~creeperlaunchbar$ npm install
    user@host:~creeperlaunchbar$ grunt download-atom-shell

Getting Started
---------------

From there we can invoke these commands to start, stop or restart Creeper:

To start creeper:

    user@host:~creeperlaunchbar$ grunt atom-shell:start

To stop creeper (if it is running):

    user@host:~creeperlaunchbar$ grunt atom-shell:stop

And to restart it (works even if it is not running):

    user@host:~creeperlaunchbar$ grunt atom-shell:restart

The logs are located in the subdirectory console, as well as the pid file of
the currently running instance of creeper.
