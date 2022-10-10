/// <reference types="node" />
import { EventEmitter } from 'events';
import { Socket, SocketConnectOpts } from 'net';
import { Callback, Stream } from './utils';
export declare type TelnetState = null | 'end' | 'failedlogin' | 'getprompt' | 'login' | 'ready' | 'response' | 'standby' | 'start';
export declare type EscapeHandler = (escapeSequence: string) => string | null;
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
    sendTimeout: number;
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
    maxEndWait?: number;
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
export declare class Telnet extends EventEmitter {
    private dataResolver;
    private endEmitted;
    private inputBuffer;
    private loginPromptReceived;
    private opts;
    private pendingData;
    private response;
    private socket;
    private state;
    constructor();
    private pushNextData;
    nextData(): Promise<string | null>;
    connect(opts: any): Promise<void>;
    shell(callback?: Callback<Stream>): Promise<Stream>;
    exec(cmd: string, opts?: ExecOptions | Callback<string>, callback?: Callback<string>): Promise<string>;
    send(data: Buffer | string, opts?: SendOptions | Callback<string>, callback?: Callback<string>): Promise<string>;
    write(data: Buffer | string, opts?: SendOptions, callback?: Callback<string>): Promise<string>;
    getSocket(): Socket | null;
    end(): Promise<void>;
    destroy(): Promise<void>;
    parseData(chunk: Buffer, isReady?: boolean[]): Buffer;
    private login;
    negotiate(chunk: Buffer): Buffer;
    private static checkSocket;
    private decode;
}
