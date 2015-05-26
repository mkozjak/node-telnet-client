[![GitHub license](https://img.shields.io/github/license/mashape/apistatus.svg)](https://github.com/mkozjak/node-telnet-client/blob/master/LICENSE)
[![Build Status](https://travis-ci.org/mkozjak/node-telnet-client.svg?branch=master)](https://travis-ci.org/mkozjak/node-telnet-client)
[![Coverage Status](https://coveralls.io/repos/mkozjak/node-telnet-client/badge.svg?branch=master)](https://coveralls.io/r/mkozjak/node-telnet-client?branch=master)  
[![NPM](https://nodei.co/npm/telnet-client.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/telnet-client/)

# node-telnet-client

A simple telnet client for node.js

## Installation

Locally in your project or globally:

```
npm install telnet-client
npm install -g telnet-client
```

## Example usage

```js
var telnet = require('telnet-client');
var connection = new telnet();

var params = {
  host: '127.0.0.1',
  port: 23,
  shellPrompt: '/ # ',
  timeout: 1500,
  // removeEcho: 4
};

connection.on('ready', function(prompt) {
  connection.exec(cmd, function(response) {
    console.log(response);
  });
});

connection.on('timeout', function() {
  console.log('socket timeout!')
  connection.end();
});

connection.on('close', function() {
  console.log('connection closed');
});

connection.connect(params);
```

## API

```js
var telnet = require('telnet-client');
var connection = new telnet();
```

### connection.connect(options)

Creates a new TCP connection to the specified host, where 'options' is an object
which can include following properties:

* `host`: Host the client should connect to. Defaults to '127.0.0.1'.
* `port`: Port the client should connect to. Defaults to '23'.
* `timeout`: Sets the socket to timeout after the specified number of milliseconds
of inactivity on the socket.
* `shellPrompt`: Shell prompt that the host is using. Defaults to regex '/(?:\/ )?#\s/'.
* `loginPrompt`: Username/login prompt that the host is using. Defaults to regex '/login[: ]*$/i'.
* `passwordPrompt`: Username/login prompt that the host is using. Defaults to regex '/Password: /i'.
* `username`: Username used to login. Defaults to 'root'.
* `password`: Username used to login. Defaults to 'guest'.
* `irs`: Input record separator. A separator used to distinguish between lines of the response. Defaults to '\r\n'.
* `ors`: Output record separator. A separator used to execute commands (break lines on input). Defaults to '\n'.
* `echoLines`: The number of lines used to cut off the response. Defaults to 1.
* `pageSeparator`: The pattern used (and removed from final output) for breaking the number of lines on output. Defaults to '---- More'.

### connection.exec(data, [options], [callback])

Sends data on the socket (should be a compatible remote host's command if sane information is wanted).
The optional callback parameter will be executed when the data is finally written out - this may not be immediately.
Command result will be passed as the first argument to the callback.

Options:

* `shellPrompt`: Shell prompt that the host is using. Defaults to regex '/(?:\/ )?#\s/'.
* `loginPrompt`: Username/login prompt that the host is using. Defaults to regex '/login[: ]*$/i'.
* `timeout`: Sets the socket to timeout after the specified number of milliseconds
of inactivity on the socket.
* `irs`: Input record separator. A separator used to distinguish between lines of the response. Defaults to '\r\n'.
* `ors`: Output record separator. A separator used to execute commands (break lines on input). Defaults to '\n'.
* `echoLines`: The number of lines used to cut off the response. Defaults to 1.

### connection.end()

Half-closes the socket. i.e., it sends a FIN packet. It is possible the server will still send some data.

### connection.destroy()

Ensures that no more I/O activity happens on this socket. Only necessary in case of errors (parse error or so).

### Event: 'connect'

Emitted when a socket connection is successfully established.

### Event: 'ready'

Emitted when a socket connection is successfully established and the client is successfully connected to the specified remote host.
A value of prompt is passed as the first argument to the callback.

### Event: 'writedone'

Emitted when the write of given data is sent to the socket.

### Event: 'timeout'

Emitted if the socket times out from inactivity. This is only to notify that the socket has been idle.
The user must manually close the connection.

### Event: 'error'

Emitted when an error occurs. The 'close' event will be called directly following this event.

### Event: 'end'

Emitted when the other end of the socket (remote host) sends a FIN packet.

### Event: 'close'

Emitted once the socket is fully closed.
