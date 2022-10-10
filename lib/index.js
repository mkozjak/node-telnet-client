"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Telnet = void 0;
const events_1 = require("events");
const net_1 = require("net");
const utils_1 = require("./utils");
const defaultOptions = {
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
};
Object.freeze(defaultOptions);
// Convert various options which can be provided as strings into regexes.
function stringToRegex(opts) {
    ['failedLoginMatch', 'loginPrompt', 'passwordPrompt', 'shellPrompt', 'waitFor'].forEach(key => {
        const value = opts[key];
        opts[key] = typeof value === 'string' ? new RegExp(value) : value;
    });
}
class Telnet extends events_1.EventEmitter {
    constructor() {
        super();
        this.endEmitted = false;
        this.inputBuffer = '';
        this.loginPromptReceived = false;
        this.opts = Object.assign({}, defaultOptions);
        this.pendingData = [];
        this.response = undefined;
        this.socket = null;
        this.state = null;
        this.on('data', data => this.pushNextData(data));
        this.on('end', () => {
            this.pushNextData(null);
            this.state = 'end';
        });
    }
    pushNextData(data) {
        if (data instanceof Buffer)
            data = data.toString(this.opts.encoding);
        else if (data != null)
            data = data.toString();
        const chunks = data ? data.split(/(?<=\r\r\n|\r?\n)/) : [data];
        if (this.dataResolver) {
            this.dataResolver(chunks[0]);
            this.dataResolver = undefined;
        }
        else
            this.pendingData.push(chunks[0]);
        if (chunks.length > 1)
            this.pendingData.push(...chunks.slice(1));
    }
    nextData() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.pendingData.length > 0)
                return this.pendingData.splice(0, 1)[0];
            else if (this.state === 'end')
                return null;
            return new Promise(resolve => this.dataResolver = resolve);
        });
    }
    connect(opts) {
        return new Promise((resolve, reject) => {
            var _a;
            let connectionPending = true;
            const rejectIt = (reason) => { connectionPending = false; reject(reason); };
            const resolveIt = () => { connectionPending = false; resolve(); };
            Object.assign(this.opts, opts !== null && opts !== void 0 ? opts : {});
            this.opts.initialCtrlC = opts.initialCtrlC && this.opts.initialCTRLC;
            this.opts.extSock = (_a = opts === null || opts === void 0 ? void 0 : opts.sock) !== null && _a !== void 0 ? _a : this.opts.extSock;
            stringToRegex(this.opts);
            // If socket is provided and in good state, just reuse it.
            if (this.opts.extSock) {
                if (!Telnet.checkSocket(this.opts.extSock))
                    return rejectIt(new Error('socket invalid'));
                this.socket = this.opts.extSock;
                this.state = 'ready';
                this.emit('ready');
                resolveIt();
            }
            else {
                this.socket = (0, net_1.createConnection)(Object.assign({ port: this.opts.port, host: this.opts.host, localAddress: this.opts.localAddress }, this.opts.socketConnectOptions), () => {
                    this.state = 'start';
                    this.emit('connect');
                    if (this.opts.initialCtrlC === true)
                        this.socket.write('\x03');
                    if (this.opts.initialLFCR === true)
                        this.socket.write('\r\n');
                    if (!this.opts.negotiationMandatory)
                        resolveIt();
                });
            }
            this.socket.setMaxListeners(Math.max(15, this.socket.getMaxListeners()));
            this.socket.setTimeout(this.opts.timeout, () => {
                if (connectionPending) {
                    // If cannot connect, emit error and destroy.
                    if (this.listeners('error').length > 0)
                        this.emit('error', 'Cannot connect');
                    this.socket.destroy();
                    return reject(new Error('Cannot connect'));
                }
                this.emit('timeout');
                return reject(new Error('timeout'));
            });
            this.socket.on('connect', () => {
                if (!this.opts.shellPrompt) {
                    this.state = 'standby';
                    resolveIt();
                }
            });
            this.socket.on('data', data => {
                let emitted = false;
                if (this.state === 'standby' || !this.opts.negotiationMandatory) {
                    this.emit('data', this.opts.newlineReplace ? Buffer.from(this.decode(data), this.opts.encoding) : data);
                    emitted = true;
                }
                const isReady = [];
                if ((data = this.parseData(data, isReady)) && connectionPending && (isReady[0] || !this.opts.shellPrompt)) {
                    resolveIt();
                    if (!this.opts.shellPrompt && !emitted)
                        this.emit('data', data);
                }
            });
            this.socket.on('error', error => {
                if (this.listeners('error').length > 0)
                    this.emit('error', error);
                if (connectionPending)
                    rejectIt(error);
            });
            this.socket.on('end', () => {
                if (!this.endEmitted) {
                    this.endEmitted = true;
                    this.emit('end');
                }
                if (connectionPending) {
                    if (this.state === 'start')
                        resolveIt();
                    else
                        rejectIt(new Error('Socket ends'));
                }
            });
            this.socket.on('close', () => {
                this.emit('close');
                if (connectionPending) {
                    if (this.state === 'start')
                        resolveIt();
                    else
                        rejectIt(new Error('Socket closes'));
                }
            });
            this.once('failedlogin', () => {
                if (connectionPending)
                    rejectIt(new Error('Failed login'));
            });
        });
    }
    shell(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, utils_1.asCallback)(new Promise(resolve => {
                resolve(new utils_1.Stream(this.socket));
            }), callback);
        });
    }
    exec(cmd, opts, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof opts === 'function') {
                callback = opts;
                opts = undefined;
            }
            return (0, utils_1.asCallback)(new Promise((resolve, reject) => {
                Object.assign(this.opts, opts || {});
                cmd += this.opts.ors;
                if (!this.socket.writable)
                    return reject(new Error('socket not writable'));
                this.socket.write(cmd, () => {
                    let execTimeout;
                    this.state = 'response';
                    this.emit('writedone');
                    const buffExecHandler = () => {
                        if (execTimeout)
                            clearTimeout(execTimeout);
                        if (!this.inputBuffer)
                            return reject(new Error('response not received'));
                        resolve(this.inputBuffer);
                        // Reset stored response.
                        this.inputBuffer = '';
                        // Set state back to 'standby' for possible telnet server push data.
                        this.state = 'standby';
                    };
                    const responseHandler = () => {
                        if (execTimeout)
                            clearTimeout(execTimeout);
                        if (this.response)
                            resolve(this.response.join(this.opts.newlineReplace || '\n'));
                        else
                            reject(new Error('invalid response'));
                        // Reset stored response.
                        this.inputBuffer = '';
                        // Set state back to 'standby' for possible telnet server push data.
                        this.state = 'standby';
                        this.removeListener('bufferexceeded', buffExecHandler);
                    };
                    this.once('responseready', responseHandler);
                    this.once('bufferexceeded', buffExecHandler);
                    if (this.opts.execTimeout) {
                        execTimeout = setTimeout(() => {
                            execTimeout = undefined;
                            this.removeListener('responseready', responseHandler);
                            this.removeListener('bufferexceeded', buffExecHandler);
                            reject(new Error('response not received'));
                        }, this.opts.execTimeout);
                    }
                });
            }), callback);
        });
    }
    send(data, opts, callback) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof opts === 'function') {
                callback = opts;
                opts = undefined;
            }
            this.opts.ors = ((_a = opts) === null || _a === void 0 ? void 0 : _a.ors) || this.opts.ors;
            data += this.opts.ors;
            return this.write(data, opts, callback);
        });
    }
    write(data, opts, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof opts === 'function') {
                callback = opts;
                opts = undefined;
            }
            return (0, utils_1.asCallback)(new Promise((resolve, reject) => {
                var _a, _b;
                Object.assign(this.opts, opts || {});
                this.opts.waitFor = (_b = (_a = opts === null || opts === void 0 ? void 0 : opts.waitFor) !== null && _a !== void 0 ? _a : opts === null || opts === void 0 ? void 0 : opts.waitfor) !== null && _b !== void 0 ? _b : false;
                stringToRegex(this.opts);
                if (this.socket.writable) {
                    let response = '';
                    let sendTimer;
                    const sendHandler = (data) => {
                        response += this.decode(data);
                        if (this.opts.waitFor instanceof RegExp) {
                            if (this.opts.waitFor.test(response)) {
                                if (sendTimer)
                                    clearTimeout(sendTimer);
                                this.socket.removeListener('data', sendHandler);
                                resolve(response);
                            }
                        }
                        else if (!sendTimer)
                            resolve(response);
                    };
                    this.socket.on('data', sendHandler);
                    try {
                        this.socket.write(data, () => {
                            if (!this.opts.sendTimeout) {
                                sendTimer = setTimeout(() => {
                                    sendTimer = undefined;
                                    if (response === '') {
                                        this.socket.removeListener('data', sendHandler);
                                        reject(new Error('response not received'));
                                        return;
                                    }
                                    this.socket.removeListener('data', sendHandler);
                                    resolve(response);
                                }, this.opts.sendTimeout);
                            }
                        });
                    }
                    catch (e) {
                        this.socket.removeListener('data', sendHandler);
                        reject(new Error('send data failed'));
                    }
                }
                else {
                    reject(new Error('socket not writable'));
                }
            }), callback);
        });
    }
    getSocket() {
        return this.socket;
    }
    end() {
        return new Promise(resolve => {
            let timer = setTimeout(() => {
                timer = undefined;
                if (!this.endEmitted) {
                    this.endEmitted = true;
                    this.emit('end');
                }
                resolve();
            }, this.opts.maxEndWait);
            this.socket.end(() => {
                if (timer) {
                    clearTimeout(timer);
                    timer = undefined;
                    resolve();
                }
            });
        });
    }
    destroy() {
        return new Promise(resolve => {
            this.socket.destroy();
            resolve();
        });
    }
    parseData(chunk, isReady) {
        if (chunk[0] === 255 && chunk[1] !== 255)
            chunk = this.negotiate(chunk);
        if (this.state === 'start')
            this.state = 'getprompt';
        if (this.state === 'getprompt') {
            const stringData = this.decode(chunk);
            const promptIndex = (0, utils_1.search)(stringData, this.opts.shellPrompt);
            if ((0, utils_1.search)(stringData, this.opts.loginPrompt) >= 0) {
                // Make sure we don't end up in an infinite loop.
                if (!this.loginPromptReceived) {
                    this.state = 'login';
                    this.login('username');
                    this.loginPromptReceived = true;
                }
            }
            else if ((0, utils_1.search)(stringData, this.opts.passwordPrompt) >= 0) {
                this.state = 'login';
                this.login('password');
            }
            else if ((0, utils_1.search)(stringData, this.opts.failedLoginMatch) >= 0) {
                this.state = 'failedlogin';
                this.emit('failedlogin', stringData);
                this.destroy().finally();
            }
            else if (promptIndex >= 0) {
                const shellPrompt = this.opts.shellPrompt instanceof RegExp ?
                    stringData.substring(promptIndex) : this.opts.shellPrompt;
                this.state = 'standby';
                this.inputBuffer = '';
                this.loginPromptReceived = false;
                this.emit('ready', shellPrompt);
                isReady === null || isReady === void 0 ? void 0 : isReady.push(true);
            }
        }
        else if (this.state === 'response') {
            if (this.inputBuffer.length >= this.opts.maxBufferLength) {
                this.emit('bufferexceeded');
                return Buffer.from(this.inputBuffer, this.opts.encoding);
            }
            const stringData = this.decode(chunk);
            this.inputBuffer += stringData;
            const promptIndex = (0, utils_1.search)(this.inputBuffer, this.opts.shellPrompt);
            if (promptIndex < 0 && (stringData === null || stringData === void 0 ? void 0 : stringData.length) > 0) {
                if ((0, utils_1.search)(stringData, this.opts.pageSeparator) >= 0)
                    this.socket.write(Buffer.from('20', 'hex'));
                return null;
            }
            const response = this.inputBuffer.split(this.opts.irs);
            for (let i = response.length - 1; i >= 0; --i) {
                if ((0, utils_1.search)(response[i], this.opts.pageSeparator) >= 0) {
                    response[i] = response[i].replace(this.opts.pageSeparator, '');
                    if (response[i].length === 0)
                        response.splice(i, 1);
                }
            }
            if (this.opts.echoLines === 1)
                response.shift();
            else if (this.opts.echoLines > 1)
                response.splice(0, this.opts.echoLines);
            else if (this.opts.echoLines < 0)
                response.splice(0, response.length - 2);
            // Remove prompt.
            if (this.opts.stripShellPrompt && response.length > 0) {
                const idx = response.length - 1;
                response[idx] = (0, utils_1.search)(response[idx], this.opts.shellPrompt) >= 0
                    ? response[idx].replace(this.opts.shellPrompt, '')
                    : '';
            }
            this.response = response;
            chunk = null;
            this.emit('responseready');
        }
        return chunk;
    }
    login(handle) {
        if ((handle === 'username' || handle === 'password') && this.socket.writable) {
            this.socket.write(this.opts[handle] + this.opts.ors, () => {
                this.state = 'getprompt';
            });
        }
    }
    negotiate(chunk) {
        /* info: http://tools.ietf.org/html/rfc1143#section-7
         * Refuse to start performing and ack the start of performance
         * DO -> WONT WILL -> DO */
        const packetLength = chunk.length;
        let negData = chunk;
        let cmdData = null;
        for (let i = 0; i < packetLength; i += 3) {
            if (chunk[i] !== 255) {
                negData = chunk.slice(0, i);
                cmdData = chunk.slice(i);
                break;
            }
        }
        const chunkHex = chunk.toString('hex');
        const defaultResponse = negData.toString('hex').replace(/fd/g, 'fc').replace(/fb/g, 'fd');
        let negResp = '';
        if (this.opts.terminalHeight && this.opts.terminalWidth) {
            for (let i = 0; i < chunkHex.length; i += 6) {
                let w, h;
                switch (chunkHex.substr(i + 2, 4)) {
                    case 'fd18':
                        negResp += 'fffb18';
                        break;
                    case 'fd1f':
                        w = this.opts.terminalWidth.toString(16).padStart(4, '0');
                        h = this.opts.terminalHeight.toString(16).padStart(4, '0');
                        negResp += `fffb1ffffa1f${w}${h}fff0`;
                        break;
                    default:
                        negResp += defaultResponse.substr(i, 6);
                }
            }
        }
        else
            negResp = defaultResponse;
        if (this.socket.writable)
            this.socket.write(Buffer.from(negResp, 'hex'));
        return cmdData;
    }
    static checkSocket(sock) {
        return sock !== null &&
            typeof sock === 'object' &&
            typeof sock.pipe === 'function' &&
            sock.writable !== false &&
            typeof sock._write === 'function' &&
            typeof sock._writableState === 'object' &&
            sock.readable !== false &&
            typeof sock._read === 'function' &&
            typeof sock._readableState === 'object';
    }
    decode(chunk) {
        if (chunk instanceof Buffer)
            chunk = chunk.toString(this.opts.encoding);
        if (this.opts.escapeHandler) {
            chunk === null || chunk === void 0 ? void 0 : chunk.replace(/\x1B((\[.*?[a-z])|.)/i, seq => {
                const response = this.opts.escapeHandler(seq);
                if (response)
                    this.socket.write(response);
                return seq;
            });
        }
        if (this.opts.stripControls) {
            chunk = chunk === null || chunk === void 0 ? void 0 : chunk.replace(/\x1B((\[.*?[a-z])|.)/i, ''); // Escape sequences
            chunk = chunk === null || chunk === void 0 ? void 0 : chunk.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // All controls except tab, lf, and cr.
        }
        if (this.opts.newlineReplace)
            chunk = chunk === null || chunk === void 0 ? void 0 : chunk.replace(/\r\r\n|\r\n?/g, this.opts.newlineReplace);
        return chunk;
    }
}
exports.Telnet = Telnet;
//# sourceMappingURL=index.js.map