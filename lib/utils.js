"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stream = exports.search = exports.asCallback = void 0;
const stream_1 = require("stream");
function asCallback(promise, callback) {
    if (typeof callback === 'function')
        promise.then(result => callback(null, result)).catch(err => callback(err));
    return promise;
}
exports.asCallback = asCallback;
function search(str, pattern) {
    if (!str || !pattern)
        return -1;
    else if (pattern instanceof RegExp)
        return str.search(pattern);
    else
        return str.indexOf(pattern);
}
exports.search = search;
class Stream extends stream_1.Duplex {
    constructor(source, options) {
        super(options);
        this.source = source;
        this.source.on('data', data => this.push(data));
    }
    _write(data, encoding, callback) {
        if (!this.source.writable)
            callback(new Error('socket not writable'));
        this.source.write(data, encoding, callback);
    }
    _read() { }
}
exports.Stream = Stream;
//# sourceMappingURL=utils.js.map