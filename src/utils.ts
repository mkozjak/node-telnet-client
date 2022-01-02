import { Duplex, DuplexOptions } from 'stream'
import { Socket } from 'net'

export type Callback<T> = (err: any, value?: T) => void;

export function asCallback<T>(promise: Promise<T>, callback?: Callback<T>): Promise<T> {
  if (typeof callback === 'function')
    promise.then(result => callback(null, result)).catch(err => callback(err))

  return promise
}

export function search(str: string, pattern: RegExp | string): number {
  if (!str || !pattern)
    return -1
  else if (pattern instanceof RegExp)
    return str.search(pattern)
  else
    return str.indexOf(pattern)
}

export class Stream extends Duplex {
  constructor(private source: Socket, options?: DuplexOptions) {
    super(options)
    this.source.on('data', data => this.push(data))
  }

  _write(data: Buffer | string, encoding?: BufferEncoding, callback?: Callback<void>): void {
    if (!this.source.writable)
      callback(new Error('socket not writable'))

    this.source.write(data, encoding, callback)
  }

  _read(): void {}
}
