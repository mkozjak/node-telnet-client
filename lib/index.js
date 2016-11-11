// Node.js Telnet client

const events = require('events')
const net = require('net')
const Promise = require('bluebird')
const utils = require('./utils')

module.exports = class Telnet extends events.EventEmitter {
  constructor() {
    super()

    this.telnetSocket = null
    this.telnetState = null
  }

  connect(opts) {
    return new Promise(resolve => {
      const host = (typeof opts.host !== 'undefined' ? opts.host : '127.0.0.1')
      const port = (typeof opts.port !== 'undefined' ? opts.port : 23)
      this.timeout = (typeof opts.timeout !== 'undefined' ? opts.timeout : 500)

      // Set prompt regex defaults
      this.shellPrompt = (typeof opts.shellPrompt !== 'undefined' ? opts.shellPrompt : /(?:\/ )?#\s/)
      this.loginPrompt = (typeof opts.loginPrompt !== 'undefined' ? opts.loginPrompt : /login[: ]*$/i)
      this.passwordPrompt = (typeof opts.passwordPrompt !== 'undefined' ? opts.passwordPrompt : /Password: /i)
      this.failedLoginMatch = opts.failedLoginMatch

      this.debug = (typeof opts.debug !== 'undefined' ? opts.debug : false)
      this.username = (typeof opts.username !== 'undefined' ? opts.username : 'root')
      this.password = (typeof opts.password !== 'undefined' ? opts.password : 'guest')
      this.irs = (typeof opts.irs !== 'undefined' ? opts.irs : '\r\n')
      this.ors = (typeof opts.ors !== 'undefined' ? opts.ors : '\n')
      this.echoLines = (typeof opts.echoLines !== 'undefined' ? opts.echoLines : 1)
      this.stripShellPrompt = (typeof opts.stripShellPrompt !== 'undefined' ? opts.stripShellPrompt : true)
      this.pageSeparator = (typeof opts.pageSeparator !== 'undefined'
        ? opts.pageSeparator : '---- More')
      this.negotiationMandatory = (typeof opts.negotiationMandatory !== 'undefined'
        ? opts.negotiationMandatory : true)
      this.execTimeout = (typeof opts.execTimeout !== 'undefined' ? opts.execTimeout : 2000)
      this.sendTimeout = (typeof opts.sendTimeout !== 'undefined' ? opts.sendTimeout : 2000)

      this.telnetSocket = net.createConnection({
        port,
        host
      }, () => {
        this.telnetState = 'start'
        this.stringData = ''

        this.emit('connect')

        if (this.negotiationMandatory === false) resolve()
      })

      this.telnetSocket.setTimeout(this.timeout, () => {
        if (this.telnetSocket._connecting === true) {
          // info: if cannot connect, emit error and destroy
          this.emit('error', 'Cannot connect')
          this.telnetSocket.destroy()
        }
        else this.emit('timeout')
      })

      this.telnetSocket.on('data', data => {
        if (this.telnetState === 'standby')
          return this.emit('data', data)

        this._parseData(data, (event, parsed) => {
          if (event === 'ready') {
            resolve(parsed)
          }
        })
      })

      this.telnetSocket.on('error', error => {
        this.emit('error', error)
      })

      this.telnetSocket.on('end', () => {
        this.emit('end')
      })

      this.telnetSocket.on('close', () => {
        this.emit('close')
      })
    })
  }

  exec(cmd, opts, callback) {
    if (opts && opts instanceof Function) callback = opts

    return new Promise((resolve, reject) => {
      if (opts && opts instanceof Object) {
        this.shellPrompt = opts.shellPrompt || this.shellPrompt
        this.loginPrompt = opts.loginPrompt || this.loginPrompt
        this.failedLoginMatch = opts.failedLoginMatch || this.failedLoginMatch
        this.timeout = opts.timeout || this.timeout
        this.execTimeout = opts.execTimeout || this.execTimeout
        this.irs = opts.irs || this.irs
        this.ors = opts.ors || this.ors
        this.echoLines = opts.echoLines || this.echoLines
      }

      cmd += this.ors

      if (!this.telnetSocket.writable)
        return reject(new Error('socket not writable'))

      this.telnetSocket.write(cmd, () => {
        let execTimeout = null
        this.telnetState = 'response'

        this.emit('writedone')

        this.once('responseready', () => {
          if (execTimeout !== null) {
            clearTimeout(execTimeout)
          }

          if (this.cmdOutput !== 'undefined') {
            resolve(this.cmdOutput.join('\n'))
          }
          else reject(new Error('invalid response'))

          // reset stored response
          this.stringData = ''

          // set state back to 'standby' for possible telnet server push data
          this.telnetState = 'standby'
        })

        if (this.execTimeout) {
          execTimeout = setTimeout(() => {
            execTimeout = null
            if (!this.cmdOutput) return reject(new Error('response not received'))
          }, this.execTimeout)
        }
      })
    }).asCallback(callback)
  }

  send(data, opts, callback) {
    if (opts && opts instanceof Function) callback = opts

    return new Promise((resolve, reject) => {
      if (opts && opts instanceof Object) {
        this.ors = opts.ors || this.ors
        this.sendTimeout = opts.timeout || this.sendTimeout

        data += this.ors
      }

      if (this.telnetSocket.writable) {
        this.telnetSocket.write(data, () => {
          let response = ''
          this.telnetState = 'standby'

          this.on('data', data => {
            response += data.toString()

            if (opts && opts.waitfor !== undefined) {
              if (!response.includes(opts.waitfor)) return

              resolve(response)
            }
          })

          if ((opts && opts.waitfor === undefined) || !opts) {
            setTimeout(() => {
              if (response === '') return reject(new Error('response not received'))

              resolve(response)
            }, this.sendTimeout)
          }
        })
      }
    }).asCallback(callback)
  }

  end() {
    return new Promise(resolve => {
      this.telnetSocket.end()
      resolve()
    })
  }

  destroy() {
    return new Promise(resolve => {
      this.telnetSocket.destroy()
      resolve()
    })
  }

  _parseData(chunk, callback) {
    var promptIndex = ''

    if (chunk[0] === 255 && chunk[1] !== 255) {
      this.stringData = ''
      const negReturn = this._negotiate(chunk)

      if (negReturn == undefined) return
      else chunk = negReturn
    }

    if (this.telnetState === 'start') {
      this.telnetState = 'getprompt'
    }

    if (this.telnetState === 'getprompt') {
      var stringData = chunk.toString()

      var promptIndex = utils.search(stringData, this.shellPrompt)

      if (typeof this.failedLoginMatch !== 'undefined' && utils.search(stringData, this.failedLoginMatch) !== -1) {
        this.telnetState = 'failedlogin'

        this.emit('failedlogin', stringData)
        this.destroy()
      }
      else if (promptIndex !== -1) {
        this.shellPrompt = stringData.substring(promptIndex)
        this.telnetState = 'standby'
        this.stringData = ''

        this.emit('ready', this.shellPrompt)

        if (callback) callback('ready', this.shellPrompt)
      }
      else if (utils.search(stringData, this.loginPrompt) !== -1) {
        this.telnetState = 'login'
        this._login('username')
      }
      else if (utils.search(stringData, this.passwordPrompt) !== -1) {
        this.telnetState = 'login'
        this._login('password')
      }
      else return
    }
    else if (this.telnetState === 'response') {
      var stringData = chunk.toString()

      this.stringData += stringData
      promptIndex = utils.search(this.stringData, this.shellPrompt)

      if (promptIndex === -1 && stringData.length !== 0) {
        if (utils.search(stringData, this.pageSeparator) !== -1) {
          this.telnetSocket.write(Buffer.from('20', 'hex'))
        }

        return
      }

      this.cmdOutput = this.stringData.split(this.irs)

      for (let i = 0; i < this.cmdOutput.length; i++) {
        if (utils.search(this.cmdOutput[i], this.pageSeparator) !== -1) {
          this.cmdOutput[i] = this.cmdOutput[i].replace(this.pageSeparator, '')

          if (this.cmdOutput[i].length === 0) this.cmdOutput.splice(i, 1)
        }
      }

      if (this.echoLines === 1) this.cmdOutput.shift()
      else if (this.echoLines > 1) this.cmdOutput.splice(0, this.echoLines)

      // remove prompt
      if (this.stripShellPrompt) {
        this.cmdOutput.pop()
        // add a blank line so that command output
        // maintains the trailing new line
        this.cmdOutput.push('')
      }

      this.emit('responseready')
    }
  }

  _login(handle) {
    if ((handle === 'username' || handle === 'password') && this.telnetSocket.writable) {
      this.telnetSocket.write(this[handle] + this.ors, () => {
        this.telnetState = 'getprompt'
      })
    }
  }

  _negotiate(chunk) {
    // info: http://tools.ietf.org/html/rfc1143#section-7
    // refuse to start performing and ack the start of performance
    // DO -> WONT WILL -> DO
    const packetLength = chunk.length

    let negData = chunk
    let cmdData = null
    let negResp = null

    for (let i = 0; i < packetLength; i+=3) {
      if (chunk[i] != 255) {
        negData = chunk.slice(0, i)
        cmdData = chunk.slice(i)
        break
      }
    }

    negResp = negData.toString('hex').replace(/fd/g, 'fc').replace(/fb/g, 'fd')

    if (this.telnetSocket.writable) this.telnetSocket.write(Buffer.from(negResp, 'hex'))

    if (cmdData != undefined) return cmdData
    else return
  }
}
