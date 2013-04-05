# sauron

procfile process manager for node stuffs

## install
```
npm install shtylman/node-sauron -g
```

## make a procfile
Make a profile somewhere on your filesystem.

```
# webservers
www1: /path/to/js/script/or/bin --args
www2: /path/to/js/script/or/bin --args

# comments start with `#`, everything else must be ident: cmd
# cmd is run as is with the args

# other stuff
magic: /path/to/more/things --42
```

## `sauron` cli tool
Note: Make sure you are in the same directory as the procfile.

### start everything that isn't already running
```
$ sauron start
```

### stop everything
```
$ sauron stop
```

### see what is running
```
$ sauron list
```

### start 1 thing
```
$ sauron start www1
```

### restart a thing
```
$ sauron restart www1
```

## metainfo
Sauron puts stuff in $HOME/.sauron

### logs
live in $HOME/.sauron/logs/<ident>.log

### pids
live in $HOME/.sauron/pids/<ident>.pid
