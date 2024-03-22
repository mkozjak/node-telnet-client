[![GitHub license](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/mkozjak/node-telnet-client/blob/master/LICENSE)
[![Build Status](https://travis-ci.org/mkozjak/node-telnet-client.svg?branch=master)](https://travis-ci.org/mkozjak/node-telnet-client)
[![npm](https://img.shields.io/npm/dm/telnet-client.svg?maxAge=2592000)](https://www.npmjs.com/package/telnet-client)
[![Donate Bitcoin/Altcoins](https://img.shields.io/badge/donate-coins-blue.svg)](https://paypal.me/kozjak)
[![npm version](https://img.shields.io/npm/v/telnet-client.svg?style=flat)](https://www.npmjs.com/package/telnet-client)

# node-telnet-client

A simple telnet client for Node.js

## Installation

Locally in your project or globally:

```bash
npm install telnet-client
npm install -g telnet-client
```

## Quick start

### Async/Await (Node.js >= 7.6.0)

_Note: As of version 2.0.0 of this API, native ES6 promises are returned, not Bluebird promises._

```js
'use strict'

const { Telnet } = require('telnet-client');

(async function () {
  const connection = new Telnet()

  // these parameters are just examples and most probably won't work for your use-case.
  const params = {
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

  const res = await connection.exec('uptime')
  console.log('async result:', res)
})()
```

### Callback-style

```js
const { Telnet } = require('telnet-client')
const connection = new Telnet()

// these parameters are just examples and most probably won't work for your use-case.
const params = {
  host: '127.0.0.1',
  port: 23,
  shellPrompt: '/ # ', // or negotiationMandatory: false
  timeout: 1500
}

connection.on('ready', prompt => {
  connection.exec(cmd, (err, response) => {
    console.log(response)
  })
})

connection.on('timeout', () => {
  console.log('socket timeout!')
  connection.end()
})

connection.on('close', () => {
  console.log('connection closed')
})

connection.connect(params)
```

### Promises

_Note: As of version 2.0.0 of this API, native ES6 promises are returned, not Bluebird promises._

```js
const { Telnet } = require('telnet-client')
const connection = new Telnet()

// these parameters are just examples and most probably won't work for your use-case.
const params = {
  host: '127.0.0.1',
  port: 23,
  shellPrompt: '/ # ', // or negotiationMandatory: false
  timeout: 1500
}

connection.connect(params)
  .then(prompt => {
    connection.exec(cmd)
    .then(res => {
      console.log('promises result:', res)
    })
  }, error => {
    console.log('promises reject:', error)
  })
  .catch(error => {
    // handle the throw (timeout)
  })
```

### Generators

```js
const co = require('co')
const toBluebird = require("to-bluebird")
const { Telnet } = require('telnet-client')
const connection = new Telnet()

// these parameters are just examples and most probably won't work for your use-case.
const params = {
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

  const res = yield connection.exec(cmd)
  console.log('coroutine result:', const)
})

// using Promise
bluebird.coroutine(function*() {
  try {
    yield toBluebird(connection.connect(params))
  } catch (error) {
    // handle the throw (timeout)
  }

  let res = yield toBluebird(connection.exec(cmd))
  console.log('coroutine result:', res)
})()
```

### Async/Await

```js
'use strict'

const { Telnet } = require('telnet-client')

process.on('unhandledRejection', error => {
  throw error
})

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

## Problems?

**Please do not directly email any node-telnet-client committers with questions or problems.**  A community is best served when discussions are held in public.

If you have a problem, please search the [issues](https://github.com/mkozjak/node-telnet-client/issues) to see if there's existing reports to the issue you're facing and if there's any known solutions.

I also offer professional (paid) support and services, so make sure to [contact me](mailto:mario.kozjak@elpheria.com?subject=Professional%20Support) for more info.

## API

```js
const { Telnet } = require('telnet-client')
const connection = new Telnet()
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
* `shellPrompt`: Shell prompt that the host is using. Can be a string or an instance of RegExp. Defaults to regex `/(?:\/ )?#\s/`. Use `negotiationMandatory: false` if you don't need this.<br><br>Set `shellPrompt` to `null` if you wish to use the `send(…)` or `write(…)` methods, ignoring the returned values, and instead relying on `nextData()` or `on('data'…` for feedback.
* `loginPrompt`: Username/login prompt that the host is using. Can be a string or an instance of RegExp. Defaults to regex `/login[: ]*$/i`.
* `passwordPrompt`: Password/login prompt that the host is using. Can be a string or an instance of RegExp. Defaults to regex `/Password: /i`.
* `failedLoginMatch`: String or regex to match if your host provides login failure messages. Defaults to undefined.
* `initialCtrlC`: Flag used to determine if an initial 0x03 (CTRL+C) should be sent when connected to server.
* `initialLFCR`: Flag used to determine if an initial '\r\n' (CR+LF) should be sent when connected to server.
* `username`: Username used to login. Defaults to 'root'.
* `password`: Password used to login. Defaults to 'guest'.
* `sock`: Duplex stream which can be used for connection hopping/reusing.
* `irs`: Input record separator. A separator used to distinguish between lines of the response. Defaults to '\r\n'.
* `ors`: Output record separator. A separator used to execute commands (break lines on input). Defaults to '\n'.
* `echoLines`: The number of lines used to cut off the response. Defaults to 1. With a value of 0, no lines are cut off.
* `stripShellPrompt`: Whether shell prompt should be excluded from the results. Defaults to true.
* `pageSeparator`: The pattern used (and removed from final output) for breaking the number of lines on output. Defaults to '---- More'.
* `negotiationMandatory`: Disable telnet negotiations if needed. Can be used with 'send' when telnet specification is not needed.
Telnet client will then basically act like a simple TCP client. Defaults to true.
* `execTimeout`: A timeout used to wait for a server reply when the 'exec' method is used. Defaults to 2000 (ms).
* `sendTimeout`: A timeout used to wait for a server reply when the 'send' method is used. Defaults to 2000 (ms).
* `maxBufferLength`: Maximum buffer length in bytes which can be filled with response data. Defaults to 1M.
* `terminalWidth`, `terminalHeight`: When set to non-zero values, `telnet-client` will respond to the host command `IAC DO 0x18` (Terminal Type) with `IAC WILL 0x18`, and it will respond to `IAC DO 0x1F` with the given terminal width and height.
* `newlineReplace`: If provided, incoming line breaks will be normalized to the provided character/string of characters.
* `escapeHandler`: An optional function that receives escape sequences (either `'0x1B'` and the next non-`[` character, or `'0x1B['` followed by every subsequent character up to and including the first ASCII letter) from the host. The function can either return `null`, which means to take no action, or a string value to be sent to the host as a response.
* `stripControls`: If set to `true`, escape sequences and control characters (except for `\t`, `\n`, and `\r`) will be stripped from incoming data. `escapeHandler` is not affected.
* `maxEndWait`: The maximum time, in milliseconds, to wait for a callback from `socket.end(…)` after calling `end()`. Defaults to 250 milliseconds.
* `encoding`: _(Experimental)_ The telnet protocol is designed mainly for 7-bit ASCII characters, and a default encoding used is `'ascii'`. You can attempt to use other encodings, however, such as `'utf8'` and `'latin1'`. Since the character values 0xF0-0xFF are used for telnet commands, not all characters for many encodings can be properly conveyed. `'utf8'` can work, however, for the roughly 64K characters in Unicode Basic Multilingual Plane (BMP).

* `disableLogon`: If set to `true`, the library will not try to login into to the host automatically. This is set to `false` by default. 

Resolves once the connection is ready (analogous to the ```ready``` event).
Rejects if the timeout is hit.

### connection.exec(data, [options], [callback]) -> Promise

Sends data on the socket (should be a compatible remote host's command if sane information is wanted).

The optional callback parameter will be executed with an error and response when the command is finally written out and the response data has been received.

If there was no error when executing the command, 'error' as the first argument to the callback will be undefined.

Command result will be passed as the second argument to the callback.

__*** Important notice/API change from 0.3.0 ***__
The callback argument is now called with a signature of (error, [response])

Options:

* `shellPrompt`: Shell prompt that the host is using. Can be a string or an instance of RegExp. Defaults to regex `/(?:\/ )?#\s/`.
* `loginPrompt`: Username/login prompt that the host is using. Can be a string or an instance of RegExp. Defaults to regex `/login[: ]*$/i`.
* `failedLoginMatch`: String or regex to match if your host provides login failure messages. Defaults to undefined.
* `timeout`: Sets the socket to timeout after the specified number of milliseconds
of inactivity on the socket.
* `execTimeout`: A timeout used to wait for a server reply when this method is used. Defaults to 'undefined'.
* `maxBufferLength`: Maximum buffer length in bytes which can be filled with response data. Defaults to 1M.
* `irs`: Input record separator. A separator used to distinguish between lines of the response. Defaults to `'\r\n'`.
* `ors`: Output record separator. A separator used to execute commands (break lines on input). Defaults to `'\n'`.
* `echoLines`: The number of lines used to cut off the response. Defaults to 1. With a value of 0, no lines are cut off.

### connection.send(data, [options], [callback]) -> Promise

Sends data on the socket without requiring telnet negotiations.

Options:

* `shellPrompt`: Shell prompt that the host is using. Can be a string or an instance of RegExp. Defaults to regex `/(?:\/ )?#\s/`. Use `negotiationMandatory: false` if you don't need this.<br><br>Set `shellPrompt` to `null` if you wish to use the `send(…)` or `write(…)` methods, ignoring the returned values, and instead relying on `nextData()` or `on('data'…` for feedback.
* `ors`: Output record separator. A separator used to execute commands (break lines on input). Defaults to '\n'.
* `waitFor`: Wait for the given string or RegExp before returning a response. If not defined, the timeout value will be used.
* `timeout`: A timeout used to wait for a server reply when the 'send' method is used. Defaults to 2000 (ms) or to sendTimeout ('connect' method) if set.
* `maxBufferLength`: Maximum buffer length in bytes which can be filled with response data. Defaults to 1M.

### connection.write(data, [options], [callback]) -> Promise

Same as `send(…)`, but `data` is sent without appending an output record separator.

### connection.nextData() -> Promise

Waits for and returns the next available data from the host, as a string value, either one line at a time, or the last-sent incomplete line. When the telnet session has ended, `nextData()` always returns a Promise that resolves to `null`.

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

Emitted when a write operation for given data is sent to the socket.

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

I offer professional support for node-telnet-client and beyond. I have many years of expertise on building robust, scalable Node.js applications and can help you overcome issues and challenges preventing you to ship your great products. I also excel in software architecture and implementation, being able to provide you with development, planning, consulting, training and customization services. Feel free to [contact me](mailto:mario.kozjak@elpheria.com?subject=Professional%20Support) so we can discuss how to help you finish your products!

## Sponsors

Become a sponsor and get your logo on project's README on GitHub with a link to your site. Feel free to [contact me](mailto:mario.kozjak@elpheria.com?subject=Sponsors) for the arrangement!

## Donate

If you love this project, consider [donating](https://paypal.me/kozjak)!

## License

This library is licensed under LGPLv3. Please see [LICENSE](LICENSE) for licensing details.
