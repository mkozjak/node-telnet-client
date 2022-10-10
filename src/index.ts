import { EventEmitter } from 'events'
import { createConnection, Socket, SocketConnectOpts } from 'net'
import { asCallback, Callback, search, Stream } from './utils'

export type TelnetState = null | 'end' | 'failedlogin' | 'getprompt' | 'login' | 'ready' | 'response' | 'standby' | 'start';

export type EscapeHandler = (escapeSequence: string) => string | null

export interface ExecOptions {
  echoLines?: number;
  execTimeout?: number;
  failedLoginMatch?: string;
  irs?: string;
  loginPrompt?: string;
  maxBufferLength?: number;
  newlineReplace?: string;
  ors?: string;
  shellPrompt?: string;
  stripControls?: boolean;
  timeout?: number;
}

export interface SendOptions {
  maxBufferLength?: number;
  newlineReplace?: string;
  ors?: string;
  shellPrompt?: string | RegExp;
  stripControls?: boolean;
  timeout?: number;
  waitFor?: string | RegExp | false;
  /** @deprecated */
  waitfor?: string | RegExp | false;
  sendTimeout?: number;
}

export interface ConnectOptions extends SendOptions {
  debug?: boolean;
  echoLines?: number;
  encoding?: BufferEncoding;
  escapeHandler?: EscapeHandler;
  execTimeout?: number;
  extSock?: any;
  failedLoginMatch?: string | RegExp;
  host?: string;
  /** @deprecated */
  initialCTRLC?: boolean;
  initialCtrlC?: boolean;
  initialLFCR?: boolean;
  irs?: string;
  localAddress?: string;
  loginPrompt?: string | RegExp;
  maxEndWait?: number,
  negotiationMandatory?: boolean;
  pageSeparator?: string | RegExp;
  password?: string;
  passwordPrompt?: string | RegExp;
  port?: number;
  sock?: Socket;
  socketConnectOptions?: SocketConnectOpts;
  stripShellPrompt?: boolean;
  terminalHeight?: number;
  terminalWidth?: number;
  username?: string;
}

const defaultOptions: ConnectOptions = {
  debug: false,
  echoLines: 1,
  encoding: 'ascii',
  execTimeout: 2000,
  host: '127.0.0.1',
  initialCtrlC: false,
  initialLFCR: false,
  irs: '\r\n',
  localAddress: '',
  loginPrompt: /login[: ]*$/i,
  maxBufferLength: 1048576,
  maxEndWait: 250,
  negotiationMandatory: true,
  ors: '\n',
  pageSeparator: '---- More',
  password: 'guest',
  passwordPrompt: /password[: ]*$/i,
  port: 23,
  sendTimeout: 2000,
  shellPrompt: /(?:\/ )?#\s/,
  stripControls: false,
  stripShellPrompt: true,
  timeout: 2000,
  username: 'root',
  waitFor: false
}

Object.freeze(defaultOptions)

// Convert various options which can be provided as strings into regexes.
function stringToRegex(opts: any): void {
  ['failedLoginMatch', 'loginPrompt', 'passwordPrompt', 'shellPrompt', 'waitFor'].forEach(key => {
    const value = opts[key]

    opts[key] = typeof value === 'string' ? new RegExp(value) : value
  })
}

export class Telnet extends EventEmitter {
  private dataResolver: any
  private endEmitted = false
  private inputBuffer: string = ''
  private loginPromptReceived = false
  private opts = Object.assign({}, defaultOptions)
  private pendingData: (string | null)[] = []
  private response: string[] = undefined
  private socket: Socket | null = null
  private state: TelnetState = null

  constructor() {
    super()

    this.on('data', data => this.pushNextData(data))
    this.on('end', () => {
      this.pushNextData(null)
      this.state = 'end'
    })
  }

  private pushNextData(data: any): void {
    if (data instanceof Buffer)
      data = data.toString(this.opts.encoding)
    else if (data != null)
      data = data.toString()

    const chunks = data ? data.split(/(?<=\r\r\n|\r?\n)/) : [data]

    if (this.dataResolver) {
      this.dataResolver(chunks[0])
      this.dataResolver = undefined
    }
    else
      this.pendingData.push(chunks[0])

    if (chunks.length > 1)
      this.pendingData.push(...chunks.slice(1))
  }

  async nextData(): Promise<string | null> {
    if (this.pendingData.length > 0)
      return this.pendingData.splice(0, 1)[0]
    else if (this.state === 'end')
      return null

    return new Promise<string>(resolve => this.dataResolver = resolve)
  }

  connect(opts: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let connectionPending = true
      const rejectIt = (reason: any): void => { connectionPending = false; reject(reason) }
      const resolveIt = (): void => { connectionPending = false; resolve() }

      Object.assign(this.opts, opts ?? {})
      this.opts.initialCtrlC = opts.initialCtrlC && this.opts.initialCTRLC
      this.opts.extSock = opts?.sock ?? this.opts.extSock
      stringToRegex(this.opts)

      // If socket is provided and in good state, just reuse it.
      if (this.opts.extSock) {
        if (!Telnet.checkSocket(this.opts.extSock))
          return rejectIt(new Error('socket invalid'))

        this.socket = this.opts.extSock
        this.state = 'ready'
        this.emit('ready')

        resolveIt()
      }
      else {
        this.socket = createConnection({
          port: this.opts.port,
          host: this.opts.host,
          localAddress: this.opts.localAddress,
          ...this.opts.socketConnectOptions
        }, () => {
          this.state = 'start'
          this.emit('connect')

          if (this.opts.initialCtrlC === true) this.socket.write('\x03')
          if (this.opts.initialLFCR === true) this.socket.write('\r\n')
          if (!this.opts.negotiationMandatory) resolveIt()
        })
      }

      this.socket.setMaxListeners(Math.max(15, this.socket.getMaxListeners()))

      this.socket.setTimeout(this.opts.timeout, () => {
        if (connectionPending) {
          // If cannot connect, emit error and destroy.
          if (this.listeners('error').length > 0)
            this.emit('error', 'Cannot connect')

          this.socket.destroy()
          return reject(new Error('Cannot connect'))
        }

        this.emit('timeout')
        return reject(new Error('timeout'))
      })

      this.socket.on('connect', () => {
        if (!this.opts.shellPrompt) {
          this.state = 'standby'
          resolveIt()
        }
      })

      this.socket.on('data', data => {
        let emitted = false

        if (this.state === 'standby' || !this.opts.negotiationMandatory) {
          this.emit('data', this.opts.newlineReplace ? Buffer.from(this.decode(data), this.opts.encoding) : data)
          emitted = true
        }

        const isReady: boolean[] = []

        if ((data = this.parseData(data, isReady)) && connectionPending && (isReady[0] || !this.opts.shellPrompt)) {
          resolveIt()

          if (!this.opts.shellPrompt && !emitted)
            this.emit('data', data)
        }
      })

      this.socket.on('error', error => {
        if (this.listeners('error').length > 0)
          this.emit('error', error)

        if (connectionPending)
          rejectIt(error)
      })

      this.socket.on('end', () => {
        if (!this.endEmitted) {
          this.endEmitted = true
          this.emit('end')
        }

        if (connectionPending) {
          if (this.state === 'start')
            resolveIt()
          else
            rejectIt(new Error('Socket ends'))
        }
      })

      this.socket.on('close', () => {
        this.emit('close')

        if (connectionPending) {
          if (this.state === 'start')
            resolveIt()
          else
            rejectIt(new Error('Socket closes'))
        }
      })

      this.once('failedlogin', () => {
        if (connectionPending)
          rejectIt(new Error('Failed login'))
      })
    })
  }

  async shell(callback?: Callback<Stream>): Promise<Stream> {
    return asCallback(new Promise(resolve => {
      resolve(new Stream(this.socket))
    }), callback)
  }

  async exec(cmd: string, opts?: ExecOptions | Callback<string>, callback?: Callback<string>): Promise<string> {
    if (typeof opts === 'function') {
      callback = opts
      opts = undefined
    }

    return asCallback(new Promise((resolve, reject) => {
      Object.assign(this.opts, opts || {})

      cmd += this.opts.ors

      if (!this.socket.writable)
        return reject(new Error('socket not writable'))

      this.socket.write(cmd, () => {
        let execTimeout: any
        this.state = 'response'
        this.emit('writedone')

        const buffExecHandler = (): void => {
          if (execTimeout)
            clearTimeout(execTimeout)

          if (!this.inputBuffer)
            return reject(new Error('response not received'))

          resolve(this.inputBuffer)
          // Reset stored response.
          this.inputBuffer = ''
          // Set state back to 'standby' for possible telnet server push data.
          this.state = 'standby'
        }

        const responseHandler = (): void => {
          if (execTimeout)
            clearTimeout(execTimeout)

          if (this.response)
            resolve(this.response.join(this.opts.newlineReplace || '\n'))
          else
            reject(new Error('invalid response'))

          // Reset stored response.
          this.inputBuffer = ''
          // Set state back to 'standby' for possible telnet server push data.
          this.state = 'standby'
          this.removeListener('bufferexceeded', buffExecHandler)
        }

        this.once('responseready', responseHandler)
        this.once('bufferexceeded', buffExecHandler)

        if (this.opts.execTimeout) {
          execTimeout = setTimeout(() => {
            execTimeout = undefined

            this.removeListener('responseready', responseHandler)
            this.removeListener('bufferexceeded', buffExecHandler)

            reject(new Error('response not received'))
          }, this.opts.execTimeout)
        }
      })
    }), callback)
  }

  async send(data: Buffer | string, opts?: SendOptions| Callback<string>, callback?: Callback<string>): Promise<string> {
    if (typeof opts === 'function') {
      callback = opts
      opts = undefined
    }

    this.opts.ors = (opts as SendOptions)?.ors || this.opts.ors
    data += this.opts.ors

    return this.write(data, opts as SendOptions, callback)
  }

  async write(data: Buffer | string, opts?: SendOptions, callback?: Callback<string>): Promise<string> {
    if (typeof opts === 'function') {
      callback = opts
      opts = undefined
    }

    return asCallback(new Promise((resolve, reject) => {
      Object.assign(this.opts, opts || {})
      this.opts.waitFor = opts?.waitFor ?? opts?.waitfor ?? false
      stringToRegex(this.opts)

      if (this.socket.writable) {
        let response = ''
        let sendTimer: any
        const sendHandler = (data: Buffer): void => {
          response += this.decode(data)

          if (this.opts.waitFor instanceof RegExp) {
            if (this.opts.waitFor.test(response)) {
              if (sendTimer)
                clearTimeout(sendTimer)
              
              this.socket.removeListener('data', sendHandler)
              resolve(response)
            }
          }
          else if(!sendTimer)
            resolve(response)
        }

        this.socket.on('data', sendHandler)

        try {
          this.socket.write(data, () => {
            if (!this.opts.sendTimeout) {
              sendTimer = setTimeout(() => {
                sendTimer = undefined

                if (response === '') {
                  this.socket.removeListener('data', sendHandler)
                  reject(new Error('response not received'))
                  return
                }

                this.socket.removeListener('data', sendHandler)
                resolve(response)
              }, this.opts.sendTimeout)
            }
          })
        }
        catch (e) {
          this.socket.removeListener('data', sendHandler)
          reject(new Error('send data failed'))
        }
      }
      else {
        reject(new Error('socket not writable'))
      }
    }), callback)
  }

  getSocket(): Socket | null {
    return this.socket
  }

  end(): Promise<void> {
    return new Promise(resolve => {
      let timer = setTimeout(() => {
        timer = undefined

        if (!this.endEmitted) {
          this.endEmitted = true
          this.emit('end')
        }

        resolve()
      }, this.opts.maxEndWait)

      this.socket.end(() => {
        if (timer) {
          clearTimeout(timer)
          timer = undefined
          resolve()
        }
      })
    })
  }

  destroy(): Promise<void> {
    return new Promise(resolve => {
      this.socket.destroy()
      resolve()
    })
  }

  parseData(chunk: Buffer, isReady?: boolean[]): Buffer {
    if (chunk[0] === 255 && chunk[1] !== 255)
      chunk = this.negotiate(chunk)

    if (this.state === 'start')
      this.state = 'getprompt'

    if (this.state === 'getprompt') {
      const stringData = this.decode(chunk)
      const promptIndex = search(stringData, this.opts.shellPrompt)

      if (search(stringData, this.opts.loginPrompt) >= 0) {
        // Make sure we don't end up in an infinite loop.
        if (!this.loginPromptReceived) {
          this.state = 'login'
          this.login('username')
          this.loginPromptReceived = true
        }
      }
      else if (search(stringData, this.opts.passwordPrompt) >= 0) {
        this.state = 'login'
        this.login('password')
      }
      else if (search(stringData, this.opts.failedLoginMatch) >= 0) {
        this.state = 'failedlogin'
        this.emit('failedlogin', stringData)
        this.destroy().finally()
      }
      else if (promptIndex >= 0) {
        const shellPrompt = this.opts.shellPrompt instanceof RegExp ?
          stringData.substring(promptIndex) : this.opts.shellPrompt

        this.state = 'standby'
        this.inputBuffer = ''
        this.loginPromptReceived = false
        this.emit('ready', shellPrompt)
        isReady?.push(true)
      }
    }
    else if (this.state === 'response') {
      if (this.inputBuffer.length >= this.opts.maxBufferLength) {
        this.emit('bufferexceeded')

        return Buffer.from(this.inputBuffer, this.opts.encoding)
      }

      const stringData = this.decode(chunk)

      this.inputBuffer += stringData

      const promptIndex = search(this.inputBuffer, this.opts.shellPrompt)

      if (promptIndex < 0 && stringData?.length > 0) {
        if (search(stringData, this.opts.pageSeparator) >= 0)
          this.socket.write(Buffer.from('20', 'hex'))

        return null
      }

      const response = this.inputBuffer.split(this.opts.irs)

      for (let i = response.length - 1; i >= 0; --i) {
        if (search(response[i], this.opts.pageSeparator) >= 0) {
          response[i] = response[i].replace(this.opts.pageSeparator, '')

          if (response[i].length === 0)
            response.splice(i, 1)
        }
      }

      if (this.opts.echoLines === 1) response.shift()
      else if (this.opts.echoLines > 1) response.splice(0, this.opts.echoLines)
      else if (this.opts.echoLines < 0) response.splice(0, response.length - 2)

      // Remove prompt.
      if (this.opts.stripShellPrompt && response.length > 0) {
        const idx = response.length - 1
        response[idx] = search(response[idx], this.opts.shellPrompt) >= 0
          ? response[idx].replace(this.opts.shellPrompt, '')
          : ''
      }

      this.response = response
      chunk = null
      this.emit('responseready')
    }

    return chunk
  }

  private login(handle: string): void {
    if ((handle === 'username' || handle === 'password') && this.socket.writable) {
      this.socket.write((this.opts as any)[handle] + this.opts.ors, () => {
        this.state = 'getprompt'
      })
    }
  }

  negotiate(chunk: Buffer): Buffer {
    /* info: http://tools.ietf.org/html/rfc1143#section-7
     * Refuse to start performing and ack the start of performance
     * DO -> WONT WILL -> DO */
    const packetLength = chunk.length

    let negData = chunk
    let cmdData = null

    for (let i = 0; i < packetLength; i += 3) {
      if (chunk[i] !== 255) {
        negData = chunk.slice(0, i)
        cmdData = chunk.slice(i)
        break
      }
    }

    const chunkHex = chunk.toString('hex')
    const defaultResponse = negData.toString('hex').replace(/fd/g, 'fc').replace(/fb/g, 'fd')
    let negResp = ''

    if (this.opts.terminalHeight && this.opts.terminalWidth) {
      for (let i = 0; i < chunkHex.length; i += 6) {
        let w, h: string

        switch (chunkHex.substr(i + 2, 4)) {
          case 'fd18':
            negResp += 'fffb18'
            break
          case 'fd1f':
            w = this.opts.terminalWidth.toString(16).padStart(4, '0')
            h = this.opts.terminalHeight.toString(16).padStart(4, '0')
            negResp += `fffb1ffffa1f${w}${h}fff0`
            break
          default:
            negResp += defaultResponse.substr(i, 6)
        }
      }
    }
    else
      negResp = defaultResponse

    if (this.socket.writable)
      this.socket.write(Buffer.from(negResp, 'hex'))

    return cmdData
  }

  private static checkSocket(sock: any): boolean {
    return sock !== null &&
      typeof sock === 'object' &&
      typeof sock.pipe === 'function' &&
      sock.writable !== false &&
      typeof sock._write === 'function' &&
      typeof sock._writableState === 'object' &&
      sock.readable !== false &&
      typeof sock._read === 'function' &&
      typeof sock._readableState === 'object'
  }

  private decode(chunk: string | Buffer): string {
    if (chunk instanceof Buffer)
      chunk = chunk.toString(this.opts.encoding)

    if (this.opts.escapeHandler) {
      chunk?.replace(/\x1B((\[.*?[a-z])|.)/i, seq => {
        const response = this.opts.escapeHandler(seq)

        if (response)
          this.socket.write(response)

        return seq
      })
    }

    if (this.opts.stripControls) {
      chunk = chunk?.replace(/\x1B((\[.*?[a-z])|.)/i, '') // Escape sequences
      chunk = chunk?.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // All controls except tab, lf, and cr.
    }

    if (this.opts.newlineReplace)
      chunk = chunk?.replace(/\r\r\n|\r\n?/g, this.opts.newlineReplace)

    return chunk
  }
}
