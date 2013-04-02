// builtin
var fs = require('fs');
var child_process = require('child_process');

var log = require('bookrc');

var pidfile = process.env.PIDFILE;

if (!pidfile) {
    console.error('PIDFILE env var not set');
    return process.exit(1);
}

// monitor a child process and restart if needed
log.info('sauron pid: %s', pidfile);

function exit(code) {
    process.removeAllListeners('exit');

    if (child) {
        child.kill('SIGKILL');
    }

    fs.unlinkSync(pidfile);
    process.exit(code || 0);
}

// capture exit if we can
process.once('exit', exit);

// handle once to allow for exit handler to be called
process.once('uncaughtException', function(err) {
    log.panic(err);
    exit(1);
});

var args = process.argv.slice(2);

// script to launch
var script = args.shift();

// current active child process
var child;
var death_count = 0;
var restart = true;
var reload = false;

log.info('sauron: script %s', script);

// terminate
process.on('SIGTERM', function() {
    log.info('sauron: shutdown');

    // don't restart the child after it is killed
    restart = false;

    // if child does not die within timeframe
    // we will force kill it
    var death_timeout = setTimeout(function() {
        log.warn('sauron: child did not shutdown when asked');
        child.kill('SIGKILL');
    }, 1000);

    // only after the child is dead can we exit
    child.once('exit', function() {
        clearTimeout(death_timeout);
        log.trace('sauron: child exited');
        exit();
    });

    child.kill('SIGTERM');
});

// restart
process.on('SIGHUP', function() {
    log.trace('sauron: restart requested');

    // TODO check for active child
    // TODO check that child process is running?

    // we want the child to come back
    restart = true;

    // this was a reload request
    reload = true;

    // if child does not exit within 1 second we will ask it to die
    var death_timeout = setTimeout(function() {
        log.warn('sauron: child did not gracefully shutdown when asked');
        child.kill('SIGKILL');
    }, 1000);

    // once child has exited, we don't have to try to reload it again
    child.once('exit', function() {
        clearTimeout(death_timeout);
    });

    // ask the child to shutdown nicely
    child.kill('SIGTERM');
});

(function start() {
    // if there is an existing child we should not start again
    if (child) {
        log.warn('sauron: a child is already running');
        return;
    }

    var child_opt = {};

    log.info('sauron: starting child: %s', script);

    // reset the reload flag
    reload = false;

    // if a child stays online long enough, clear the rapid death count
    var death_reset_timer = setTimeout(function() {
        death_count = 0;
    }, 1000);

    // fork does not allow the child to die normally
    child = child_process.fork(script, args, child_opt);

    // handle restarting child on exit
    child.once('exit', function() {
        child = undefined;

        // rapid restarts will lead to no longer trying
        clearTimeout(death_reset_timer);

        // no more restarting (done)
        if (!restart) {
            return;
        }

        // restart was requested
        if (reload) {
            log.trace('sauron: restarting');
            return start();
        }

        log.warn('child died');

        // no more restarts
        if (++death_count >= 5) {
            log.panic('sauron: child restarted too quickly');
            restart = false;
            return exit(1);
        }

        start();
    });
})();

