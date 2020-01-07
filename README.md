[![GitHub license](https://img.shields.io/github/license/mashape/apistatus.svg)](https://github.com/mkozjak/node-telnet-client/blob/master/LICENSE)
[![Build Status](https://travis-ci.org/mkozjak/node-telnet-client.svg?branch=master)](https://travis-ci.org/mkozjak/node-telnet-client)
[![npm](https://img.shields.io/npm/dm/telnet-client.svg?maxAge=2592000)](https://www.npmjs.com/package/telnet-client)
[![Donate Bitcoin/Altcoins](https://img.shields.io/badge/donate-coins-blue.svg)](https://paypal.me/kozjak)  
[![npm version](https://img.shields.io/npm/v/telnet-client.svg?style=flat)](https://www.npmjs.com/package/telnet-client)

# node-telnet-client

A simple telnet client for Node.js

## Installation

Locally in your project or globally:

```
npm install telnet-client
npm install -g telnet-client
```

## Quick start
### Async/Await (Node.js >= 7.6.0)

```js
'use strict'

const Telnet = require('telnet-client')

async function run() {
  let connection = new Telnet()

  // these parameters are just examples and most probably won't work for your use-case.
  let params = {
    host: '127.0.0.1',
    port: 23,
    shellPrompt: '/ # ', // or negotiationMandatory: false
    timeout: 1500
  }

  try {
    await connection.connect(params)
  } catch(error) {
    // handle the throw (timeout)
  }

  let res = await connection.exec('uptime')
  console.log('async result:', res)
}

run()
```

### Callback-style

```js
var Telnet = require('telnet-client')
var connection = new Telnet()

// these parameters are just examples and most probably won't work for your use-case.
var params = {
  host: '127.0.0.1',
  port: 23,
  shellPrompt: '/ # ', // or negotiationMandatory: false
  timeout: 1500,
  // removeEcho: 4
}

connection.on('ready', function(prompt) {
  connection.exec(cmd, function(err, response) {
    console.log(response)
  })
})

connection.on('timeout', function() {
  console.log('socket timeout!')
  connection.end()
})

connection.on('close', function() {
  console.log('connection closed')
})

connection.connect(params)
```

### Promises

```js
var Telnet = require('telnet-client')
var connection = new Telnet()

// these parameters are just examples and most probably won't work for your use-case.
var params = {
  host: '127.0.0.1',
  port: 23,
  shellPrompt: '/ # ', // or negotiationMandatory: false
  timeout: 1500,
  // removeEcho: 4
}

connection.connect(params)
.then(function(prompt) {
  connection.exec(cmd)
  .then(function(res) {
    console.log('promises result:', res)
  })
}, function(error) {
  console.log('promises reject:', error)
})
.catch(function(error) {
  // handle the throw (timeout)
})
```

### Generators

```js
var co = require('co')
var bluebird = require('bluebird')
var Telnet = require('telnet-client')
var connection = new Telnet()

// these parameters are just examples and most probably won't work for your use-case.
var params = {
  host: '127.0.0.1',
  port: 23,
  shellPrompt: '/ # ', // or negotiationMandatory: false
  timeout: 1500,
  // removeEcho: 4
}

// using 'co'
co(function*() {
  try {
    yield connection.connect(params)
  } catch (error) {
    // handle the throw (timeout)
  }

  let res = yield connection.exec(cmd)
  console.log('coroutine result:', res)
})

// using 'bluebird'
bluebird.coroutine(function*() {
  try {
    yield connection.connect(params)
  } catch (error) {
    // handle the throw (timeout)
  }

  let res = yield connection.exec(cmd)
  console.log('coroutine result:', res)
})()
```

### Async/Await (using babeljs)

```js
'use strict'

const Promise = require('bluebird')
const telnet = require('telnet-client')

require('babel-runtime/core-js/promise').default = Promise

Promise.onPossiblyUnhandledRejection(function(error) {
  throw error
})

// also requires additional babeljs setup

async function run() {
  let connection = new Telnet()

  // these parameters are just examples and most probably won't work for your use-case.
  let params = {
    host: '127.0.0.1',
    port: 23,
    shellPrompt: '/ # ', // or negotiationMandatory: false
    timeout: 1500
  }

  try {
    await connection.connect(params)
  } catch (error) {
    // handle the throw (timeout)
  }

  let res = await connection.exec(cmd)
  console.log('async result:', res)
}

run()
```

## API

```js
var Telnet = require('telnet-client')
var connection = new Telnet()
```

### connection.connect(options) -> Promise

Creates a new TCP connection to the specified host, where 'options' is an object
which can include following properties:

* `host`: Host the client should connect to. Defaults to '127.0.0.1'.
* `port`: Port the client should connect to. Defaults to '23'.
* `localAddress`: Local interface to bind for network connections. Defaults to an empty string. More information can be found [here](https://nodejs.org/api/net.html#net_socket_localaddress).
* `socketConnectOptions`: Allows to pass an object, which can contain every property from Node's SocketConnectOpts. Defaults to an empty object. Properties defined inside this object will overwrite any of the three above properties. More information can be found [here](https://nodejs.org/dist/latest-v12.x/docs/api/net.html#net_socket_connect_options_connectlistener).
* `timeout`: Sets the socket to timeout after the specified number of milliseconds.
of inactivity on the socket.
* `shellPrompt`: Shell prompt that the host is using. Can be a string or an instance of RegExp. Defaults to regex '/(?:\/ )?#\s/'. Use `negotiationMandatory: false` if you don't need this.
* `loginPrompt`: Username/login prompt that the host is using. Can be a string or an instance of RegExp. Defaults to regex '/login[: ]*$/i'.
* `passwordPrompt`: Password/login prompt that the host is using. Can be a string or an instance of RegExp. Defaults to regex '/Password: /i'.
* `failedLoginMatch`: String or regex to match if your host provides login failure messages. Defaults to undefined.
* `initialLFCR`: Flag used to determine if an initial '\r\n' (CR+LF) should be sent when connected to server.
* `username`: Username used to login. Defaults to 'root'.
* `password`: Password used to login. Defaults to 'guest'.
* `sock`: Duplex stream which can be used for connection hopping/reusing.
* `irs`: Input record separator. A separator used to distinguish between lines of the response. Defaults to '\r\n'.
* `ors`: Output record separator. A separator used to execute commands (break lines on input). Defaults to '\n'.
* `echoLines`: The number of lines used to cut off the response. Defaults to 1.
* `stripShellPrompt`: Whether shell prompt should be excluded from the results. Defaults to true.
* `pageSeparator`: The pattern used (and removed from final output) for breaking the number of lines on output. Defaults to '---- More'.
* `negotiationMandatory`: Disable telnet negotiations if needed. Can be used with 'send' when telnet specification is not needed.
Telnet client will then basically act like a simple TCP client. Defaults to true.
* `execTimeout`: A timeout used to wait for a server reply when the 'exec' method is used. Defaults to 2000 (ms).
* `sendTimeout`: A timeout used to wait for a server reply when the 'send' method is used. Defaults to 2000 (ms).
* `maxBufferLength`: Maximum buffer length in bytes which can be filled with response data. Defaults to 1M.
* `debug`: Enable/disable debug logs on console. Defaults to false.

Resolves once the connection is ready (analogous to the ```ready``` event).
Rejects if the timeout is hit.

### connection.exec(data, [options], [callback]) -> Promise

Sends data on the socket (should be a compatible remote host's command if sane information is wanted).
The optional callback parameter will be executed with an error and response when the command is finally written out and the response data has been received.  
If there was no error when executing the command, 'error' as the first argument to the callback will be undefined.
Command result will be passed as the second argument to the callback.  

__*** important notice/API change from 0.3.0 ***__  
The callback argument is now called with a signature of (error, [response])  

Options:

* `shellPrompt`: Shell prompt that the host is using. Can be a string or an instance of RegExp. Defaults to regex '/(?:\/ )?#\s/'.
* `loginPrompt`: Username/login prompt that the host is using. Can be a string or an instance of RegExp. Defaults to regex '/login[: ]*$/i'.
* `failedLoginMatch`: String or regex to match if your host provides login failure messages. Defaults to undefined.
* `timeout`: Sets the socket to timeout after the specified number of milliseconds
of inactivity on the socket.
* `execTimeout`: A timeout used to wait for a server reply when this method is used. Defaults to 'undefined'.
* `maxBufferLength`: Maximum buffer length in bytes which can be filled with response data. Defaults to 1M.
* `irs`: Input record separator. A separator used to distinguish between lines of the response. Defaults to '\r\n'.
* `ors`: Output record separator. A separator used to execute commands (break lines on input). Defaults to '\n'.
* `echoLines`: The number of lines used to cut off the response. Defaults to 1.

### connection.send(data, [options], [callback]) -> Promise

Sends data on the socket without requiring telnet negotiations.

Options:

* `ors`: Output record separator. A separator used to execute commands (break lines on input). Defaults to '\n'.
* `waitfor`: Wait for the given string or RegExp before returning a response. If not defined, the timeout value will be used.
* `timeout`: A timeout used to wait for a server reply when the 'send' method is used. Defaults to 2000 (ms) or to sendTimeout ('connect' method) if set.
* `maxBufferLength`: Maximum buffer length in bytes which can be filled with response data. Defaults to 1M.

### connection.shell(callback) -> Promise

Starts an interactive shell session. Returns a duplex stream which can be used to read and write data.

### connection.getSocket() -> net.Socket

Returns a duplex stream that can be used for connection hopping. See 'sock' option.

### connection.end() -> Promise

Half-closes the socket. i.e., it sends a FIN packet. It is possible the server will still send some data.

### connection.destroy() -> Promise

Ensures that no more I/O activity happens on this socket. Only necessary in case of errors (parse error or so).

### Event: 'connect'

Emitted when a socket connection is successfully established.

### Event: 'ready'

Emitted when a socket connection is successfully established and the client is successfully connected to the specified remote host.
A value of prompt is passed as the first argument to the callback.

### Event: 'writedone'

Emitted when the write of given data is sent to the socket.

### Event: 'data'

This is a forwarded 'data' event from core 'net' library. A `<buffer>` is received when this event is triggered.

### Event: 'timeout'

Emitted if the socket times out from inactivity. This is only to notify that the socket has been idle.
The user must manually close the connection.

### Event: 'failedlogin'

Emitted when the failedLoginMatch pattern is provided and a match is found from the host. The 'destroy()' method is called directly following this event.

### Event: 'error'

Emitted when an error occurs. The 'close' event will be called directly following this event.

### Event: 'end'

Emitted when the other end of the socket (remote host) sends a FIN packet.

### Event: 'close'

Emitted once the socket is fully closed.

## Professional support
I offer professional support for node-telnet-client and beyond. I have many years of expertise on building robust, scalable Node.js applications and can help you overcome issues and challenges preventing you to ship your great products. I also excel in software architecture and implementation, being able to provide you with development, planning, consulting, training and customization services. Feel free to [contact me](mailto:kozjakm1@gmail.com?subject=Professional%20Support) so we can discuss how to help you finish your products!

## Sponsors
Become a sponsor and get your logo on project's README on GitHub with a link to your site. Feel free to [contact me](mailto:kozjakm1@gmail.com?subject=Sponsors) for the arrangement!

## Donate

If you love this project, consider [donating](https://paypal.me/kozjak)!

## License

  [MIT](LICENSE)
