// Node.js Telnet client

var events = require('events')
var net = require('net')
var Promise = require('bluebird')
var socket = new net.Socket()
var util = require('util')

// define a constructor (object) and inherit EventEmitter functions
function Telnet() {
  events.EventEmitter.call(this)
  if (false === (this instanceof Telnet)) return new Telnet()
}

util.inherits(Telnet, events.EventEmitter)

Telnet.prototype.connect = function(opts) {
  var self = this

  return new Promise(function(resolve) {
    var host = (typeof opts.host !== 'undefined' ? opts.host : '127.0.0.1')
    var port = (typeof opts.port !== 'undefined' ? opts.port : 23)
    self.timeout = (typeof opts.timeout !== 'undefined' ? opts.timeout : 500)

    // Set prompt regex defaults
    self.shellPrompt = (typeof opts.shellPrompt !== 'undefined' ? opts.shellPrompt : /(?:\/ )?#\s/)
    self.loginPrompt = (typeof opts.loginPrompt !== 'undefined' ? opts.loginPrompt : /login[: ]*$/i)
    self.passwordPrompt = (typeof opts.passwordPrompt !== 'undefined' ? opts.passwordPrompt : /Password: /i)
    self.failedLoginMatch = opts.failedLoginMatch

    self.debug = (typeof opts.debug !== 'undefined' ? opts.debug : false)
    self.username = (typeof opts.username !== 'undefined' ? opts.username : 'root')
    self.password = (typeof opts.password !== 'undefined' ? opts.password : 'guest')
    self.irs = (typeof opts.irs !== 'undefined' ? opts.irs : '\r\n')
    self.ors = (typeof opts.ors !== 'undefined' ? opts.ors : '\n')
    self.echoLines = (typeof opts.echoLines !== 'undefined' ? opts.echoLines : 1)
    self.stripShellPrompt = (typeof opts.stripShellPrompt !== 'undefined' ? opts.stripShellPrompt : true)
    self.pageSeparator = (typeof opts.pageSeparator !== 'undefined'
      ? opts.pageSeparator : '---- More')
    self.negotiationMandatory = (typeof opts.negotiationMandatory !== 'undefined'
      ? opts.negotiationMandatory : true)
    self.sendTimeout = (typeof opts.sendTimeout !== 'undefined' ? opts.sendTimeout : 2000)

    self.response = ''
    self.telnetState

    self.telnetSocket = net.createConnection({
      port: port,
      host: host
    }, function() {
      self.telnetState = 'start'
      self.stringData = ''
      self.emit('connect')

      if (self.negotiationMandatory === false) resolve()
    })

    self.telnetSocket.setTimeout(self.timeout, function() {
      if (self.telnetSocket._connecting === true) {
        // info: if cannot connect, emit error and destroy
        self.emit('error', 'Cannot connect')
        self.telnetSocket.destroy()
      }
      else self.emit('timeout')
    })

    self.telnetSocket.on('data', function(data) {
      if (self.telnetState === 'standby')
        return self.emit('data', data)

      parseData(data, self, function(event, parsed) {
        if (event === 'ready') {
          resolve(parsed)
        }
      })
    })

    self.telnetSocket.on('error', function(error) {
      self.emit('error', error)
    })

    self.telnetSocket.on('end', function() {
      self.emit('end')
    })

    self.telnetSocket.on('close', function() {
      self.emit('close')
    })
  })
}

Telnet.prototype.exec = function(cmd, opts, callback) {
  var self = this

  if (opts && opts instanceof Function) callback = opts

  return new Promise(function(resolve, reject) {
    if (opts && opts instanceof Object) {
      self.shellPrompt = opts.shellPrompt || self.shellPrompt
      self.loginPrompt = opts.loginPrompt || self.loginPrompt
      self.failedLoginMatch = opts.failedLoginMatch || self.failedLoginMatch
      self.timeout = opts.timeout || self.timeout
      self.irs = opts.irs || self.irs
      self.ors = opts.ors || self.ors
      self.echoLines = opts.echoLines || self.echoLines
    }

    cmd += self.ors

    if (self.telnetSocket.writable) {
      self.telnetSocket.write(cmd, function() {
        self.telnetState = 'response'
        self.emit('writedone')

        self.once('responseready', function() {
          if (self.cmdOutput !== 'undefined') {
            resolve(self.cmdOutput.join('\n'))
          }
          else reject(new Error('invalid response'))

          // reset stored response
          self.stringData = ''

          // set state back to 'standby' for possible telnet server push data
          self.telnetState = 'standby'
        })
      })
    }
  }).asCallback(callback)
}

Telnet.prototype.send = function(data, opts, callback) {
  var self = this

  if (opts && opts instanceof Function) callback = opts

  return new Promise(function(resolve, reject) {
    if (opts && opts instanceof Object) {
      this.ors = opts.ors || self.ors
      self.sendTimeout = opts.timeout || self.sendTimeout
    }

    data += this.ors

    if (self.telnetSocket.writable) {
      self.telnetSocket.write(data, function() {
        var response = ''
        self.telnetState = 'standby'

        self.on('data', function(data) {
          response += data.toString()

          if (opts.waitfor !== undefined) {
            if (response.indexOf(opts.waitfor) === -1) return

            resolve(response)
          }
        })

        if (opts.waitfor === undefined) {
          setTimeout(function() {
            if (response === '') return reject(new Error('response not received'))

            resolve(response)
          }, self.sendTimeout)
        }
      })
    }
  }).asCallback(callback)
}

Telnet.prototype.end = function() {
  var self = this

  return new Promise(function(resolve) {
    self.telnetSocket.end()
    resolve()
  })
}

Telnet.prototype.destroy = function() {
  var self = this

  return new Promise(function(resolve) {
    self.telnetSocket.destroy()
    resolve()
  })
}

function parseData(chunk, telnetObj, callback) {
  var promptIndex = ''

  if (chunk[0] === 255 && chunk[1] !== 255) {
    telnetObj.stringData = ''
    var negReturn = negotiate(telnetObj.telnetSocket, chunk)

    if (negReturn == undefined) return
    else chunk = negReturn
  }

  if (telnetObj.telnetState === 'start') {
    telnetObj.telnetState = 'getprompt'
  }

  if (telnetObj.telnetState === 'getprompt') {
    var stringData = chunk.toString()

    var promptIndex = search(stringData, telnetObj.shellPrompt)

    if (typeof telnetObj.failedLoginMatch !== 'undefined' && search(stringData, telnetObj.failedLoginMatch) !== -1) {
      telnetObj.telnetState = 'failedlogin'
      telnetObj.emit('failedlogin', stringData)
      telnetObj.destroy()
    }
    else if (promptIndex !== -1) {
      telnetObj.shellPrompt = stringData.substring(promptIndex)
      telnetObj.telnetState = 'standby'
      telnetObj.stringData = ''
      telnetObj.emit('ready', telnetObj.shellPrompt)

      if (callback) callback('ready', telnetObj.shellPrompt)
    }
    else if (search(stringData, telnetObj.loginPrompt) !== -1) {
      telnetObj.telnetState = 'login'
      login(telnetObj, 'username')
    }
    else if (search(stringData, telnetObj.passwordPrompt) !== -1) {
      telnetObj.telnetState = 'login'
      login(telnetObj, 'password')
    }
    else return
  }
  else if (telnetObj.telnetState === 'response') {
    var stringData = chunk.toString()

    telnetObj.stringData += stringData
    promptIndex = telnetObj.stringData.indexOf(telnetObj.shellPrompt)

    if (promptIndex === -1 && stringData.length !== 0) {
      if (search(stringData, telnetObj.pageSeparator) !== -1) {
        telnetObj.telnetSocket.write(Buffer('20', 'hex'))
      }

      return
    }

    telnetObj.cmdOutput = telnetObj.stringData.split(telnetObj.irs)

    for (var i = 0; i < telnetObj.cmdOutput.length; i++) {
      if (search(telnetObj.cmdOutput[i], telnetObj.pageSeparator) !== -1) {
        telnetObj.cmdOutput[i] = telnetObj.cmdOutput[i].replace(telnetObj.pageSeparator, '')

        if (telnetObj.cmdOutput[i].length === 0) telnetObj.cmdOutput.splice(i, 1)
      }
    }

    if (telnetObj.echoLines === 1) telnetObj.cmdOutput.shift()
    else if (telnetObj.echoLines > 1) telnetObj.cmdOutput.splice(0, telnetObj.echoLines)

    // remove prompt
    if (telnetObj.stripShellPrompt) telnetObj.cmdOutput.pop()

    telnetObj.emit('responseready')
  }
}

function login(telnetObj, handle) {
  if ((handle === 'username' || handle === 'password') && telnetObj.telnetSocket.writable) {
    telnetObj.telnetSocket.write(telnetObj[handle] + telnetObj.ors, function() {
      telnetObj.telnetState = 'getprompt'
    })
  }
}

function negotiate(socket, chunk) {
  // info: http://tools.ietf.org/html/rfc1143#section-7
  // refuse to start performing and ack the start of performance
  // DO -> WONT WILL -> DO
  var packetLength = chunk.length, negData = chunk, cmdData, negResp

  for (var i = 0; i < packetLength; i+=3) {
    if (chunk[i] != 255) {
      negData = chunk.slice(0, i)
      cmdData = chunk.slice(i)
      break
    }
  }

  negResp = negData.toString('hex').replace(/fd/g, 'fc').replace(/fb/g, 'fd')

  if (socket.writable) socket.write(Buffer(negResp, 'hex'))

  if (cmdData != undefined) return cmdData
  else return
}

function search(str, pattern){
    if (pattern instanceof RegExp) return str.search(pattern)
    else return str.indexOf(pattern)
}

module.exports = Telnet
