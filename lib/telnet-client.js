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
    self.shellPrompt = checkRegExp(opts.shellPrompt, /(?:\/ )?#\s/)
    self.loginPrompt = checkRegExp(opts.loginPrompt, /login[: ]*$/i)
    self.passwordPrompt = checkRegExp(opts.passwordPrompt, /Password: /i)
    self.failedLoginPrompt = checkRegExp(opts.failedLoginPrompt, undefined)

    self.debug = (typeof opts.debug !== 'undefined' ? opts.debug : false)
    self.username = (typeof opts.username !== 'undefined' ? opts.username : 'root')
    self.password = (typeof opts.password !== 'undefined' ? opts.password : 'guest')
    self.irs = (typeof opts.irs !== 'undefined' ? opts.irs : '\r\n')
    self.ors = (typeof opts.ors !== 'undefined' ? opts.ors : '\n')
    self.echoLines = (typeof opts.echoLines !== 'undefined' ? opts.echoLines : 1)
    self.pageSeparator = (typeof opts.pageSeparator !== 'undefined'
      ? opts.pageSeparator : '---- More')
    self.response = ''
    self.telnetState

    self.telnetSocket = net.createConnection({
      port: port,
      host: host
    }, function() {
      self.telnetState = 'start'
      self.stringData = ''
      self.emit('connect')
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
  cmd += this.ors
  if (opts && opts instanceof Function) callback = opts

  return new Promise(function(resolve, reject) {
    if (opts && opts instanceof Object) {
      self.shellPrompt = checkRegExp(opts.shellPrompt, self.shellPrompt)
      self.loginPrompt = checkRegExp(opts.loginPrompt, self.loginPrompt)
      self.failedLoginPrompt = checkRegExp(opts.failedLoginPrompt, self.failedLoginPrompt)
      self.timeout = opts.timeout || self.timeout
      self.irs = opts.irs || self.irs
      self.ors = opts.ors || self.ors
      self.echoLines = opts.echoLines || self.echoLines
    }

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
        })
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

    var promptIndex = stringData.search(telnetObj.shellPrompt)
    if (promptIndex !== -1) {
      telnetObj.shellPrompt = stringData.substring(promptIndex)
      telnetObj.telnetState = 'sendcmd'
      telnetObj.stringData = ''
      telnetObj.emit('ready', telnetObj.shellPrompt)

      if (callback) callback('ready', telnetObj.shellPrompt)
    }
    else if (stringData.search(telnetObj.loginPrompt) !== -1) {
      telnetObj.telnetState = 'login'
      login(telnetObj, 'username')
    }
    else if (stringData.search(telnetObj.passwordPrompt) !== -1) {
      telnetObj.telnetState = 'login'
      login(telnetObj, 'password')
    }
    else if (typeof telnetObj.failedLoginPrompt !== 'undefined' && stringData.search(telnetObj.failedLoginPrompt) !== -1) {
      telnetObj.telnetState = 'failedlogin'
      telnetObj.emit('failedlogin', stringData)
      telnetObj.destroy()
    }
    else return
  }
  else if (telnetObj.telnetState === 'response') {
    var stringData = chunk.toString()
    telnetObj.stringData += stringData
    promptIndex = stringData.indexOf(telnetObj.shellPrompt)
    if (promptIndex === -1 && stringData.length !== 0) {
      if (stringData.search(telnetObj.pageSeparator) !== -1) {
        telnetObj.telnetSocket.write(Buffer('20', 'hex'))
      }

      return
    }

    telnetObj.cmdOutput = telnetObj.stringData.split(telnetObj.irs)
    for (var i = 0; i < telnetObj.cmdOutput.length; i++) {
      if (telnetObj.cmdOutput[i].search(telnetObj.pageSeparator) !== -1) {
        telnetObj.cmdOutput[i] = telnetObj.cmdOutput[i].replace(telnetObj.pageSeparator, '')
        if (telnetObj.cmdOutput[i].length === 0) telnetObj.cmdOutput.splice(i, 1)
      }
    }

    if (telnetObj.echoLines === 1) telnetObj.cmdOutput.shift()
    else if (telnetObj.echoLines > 1) telnetObj.cmdOutput.splice(0, telnetObj.echoLines)

    // remove prompt
    telnetObj.cmdOutput.pop()

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

function checkRegExp(str, def){
  if (!str) {
    return def
  }

  if (str instanceof RegExp) {
    // if they sent a regex obj, use it
    return str
  }
  else {
    // otherwise, convert their string to the equivalent regex
    try {
      return new RegExp(str)
    }
    catch(error) {
      if (self.debug) console.error('Invalid RegExp:', str)
    }
  }
}

module.exports = Telnet
