/// <reference types="node" />
import { Duplex, DuplexOptions } from 'stream';
import { Socket } from 'net';
export declare type Callback<T> = (err: any, value?: T) => void;
export declare function asCallback<T>(promise: Promise<T>, callback?: Callback<T>): Promise<T>;
export declare function search(str: string, pattern: RegExp | string): number;
export declare class Stream extends Duplex {
    private source;
    constructor(source: Socket, options?: DuplexOptions);
    _write(data: Buffer | string, encoding?: BufferEncoding, callback?: Callback<void>): void;
    _read(): void;
}
