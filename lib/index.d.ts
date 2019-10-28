import { EventEmitter } from 'events';
import { Stream } from 'stream';
import { Socket, SocketConnectOpts } from 'net';

declare interface ConnectOptions {
    host?: string;
    port?: number;
    localAddress?: string;
    socketConnectOptions?: SocketConnectOpts;
    timeout?: number;
    shellPrompt?: string;
    loginPrompt?: string|RegExp;
    passwordPrompt?: string|RegExp;
    failedLoginMatch?: string|RegExp;
    initialLFCR?: boolean;
    username?: string;
    password?: string;
    sock?: Socket;
    irs?: string;
    ors?: string;
    echoLines?: number;
    pageSeparator?: string|RegExp;
    negotiationMandatory?: boolean;
    execTimeout?: number;
    sendTimeout?: number;
    sendTmaxBufferLengthimeout?: number;
    debug?: boolean;
}

declare interface ExecOptions {
    shellPrompt?: string;
    loginPrompt?: string;
    failedLoginMatch?: string;
    timeout?: number;
    execTimeout?: number;
    irs?: string;
    ors?: string;
    echoLines?: number;
    maxBufferLength?: number;
}

declare interface SendOptions {
    ors?: string;
    waitfor?: string|RegExp;
    timeout?: number;
    maxBufferLength?: number;
}

export default class telnet_client extends EventEmitter {
    constructor();

    connect(params: ConnectOptions): Promise<void>;

    destroy(): Promise<void>;

    end(): Promise<void>;

    exec(cmd: string, options?: ExecOptions): Promise<string>;

    getSocket(): Socket;

    send(cmd: string, options?: SendOptions): Promise<string>;

    shell(): Promise<Stream>;

    public socket: Socket;

    public state: 'ready'|'start'|'standby'|'response'|'getprompt'|'login'|'failedlogin'|null;
}
