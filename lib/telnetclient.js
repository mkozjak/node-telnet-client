var util = require('util');
var events = require('events');
var net = require('net');
var socket = new net.Socket();


// define a constructor (object) and inherit EventEmitter functions
function Telnet() {
  events.EventEmitter.call(this);
  if (false === (this instanceof Telnet)) return new Telnet();
}

util.inherits(Telnet, events.EventEmitter);

Telnet.prototype.connect = function(opts) {
  this._response = '';
  this._params = opts;
  var self = this;

  console.log('MODULE: connecting to %s with %s', opts.host, opts.prompt);

  // create socket and store user data in '_params' object
  this._telnetSocket = net.createConnection({
    port: opts.port,
    host: opts.host
  }, function() {
    self._params['telnetState'] = 'start';
    self._params['stringData'] = '';
    console.log('MODULE: connected!');
  });

  this._telnetSocket.on('data', function(data) {
    // console.log('data okinut, state je %s, a stringData ima %s',
    //   self._params['telnetState'], self._params['stringData']);

    parser(data, self);
  });

  this._telnetSocket.on('end', function() {
    console.log('MODULE: socket end triggered!');
    self.emit('end');
  });

  this._telnetSocket.on('close', function() {
    console.log('MODULE: socket close triggered!');
    self.emit('close');
  });
}

Telnet.prototype.setTimeout = function(msecs, callback) {
  // reuse 'net' lib's setTimeout()
  this._telnetSocket.setTimeout(msecs, callback);
}

Telnet.prototype.exec = function(cmd, callback) {
  var self = this;
  console.log('MODULE: exec - sending to %s:%s',
      this._telnetSocket.remoteAddress, this._telnetSocket.remotePort);

  this._telnetSocket.write(cmd, function() {
    if (callback) callback('MODULE: msg sent!');
    self._params['telnetState'] = 'response';
  });
}

Telnet.prototype.close = function() {
  this._telnetSocket.destroy();
}

function parser(chunk, obj) {
  var promptIndex = '';

  if (obj._params['telnetState'] === 'start' && chunk[0] === 255 &&
      chunk[1] === 253 && chunk[2] === 1 && chunk[3] === 255 &&
      chunk[4] === 253 && chunk[5] === 31) {
    console.log('PARSER: go negotiate!');

    obj._params['telnetState'] = 'negotiate';
    obj._params['stringData'] = '';

    negotiate(obj);
  }
  else if (obj._params['telnetState'] === 'prompt') {
    var stringData = chunk.toString();
    promptIndex = stringData.search(obj._params.prompt);

    if (promptIndex != -1) {
      console.log('PARSER: PROMPT - "%s"', stringData.substring(promptIndex));

      obj._params['telnetState'] = 'sendcmd';
      obj._params['stringData'] = '';
      obj.emit('ready');
    }
    else {
      console.log('PARSER: prompt not matched, saving data');

      obj._params['stringData'] += stringData;
    }
  }
  else if (obj._params['telnetState'] === 'response') {
    var stringData = chunk.toString();
    obj._params['stringData'] += stringData;
    promptIndex = stringData.search(obj._params.prompt);

    if (promptIndex != -1) {
      var array = obj._params['stringData'].split('\n');

      if (obj._params['willEcho'] == 1) array.shift();
      array.pop();

      console.log('PARSER: RESPONSE -', array);
      obj._telnetSocket.end();
    }
  }
}

function negotiate(obj) {
  obj._telnetSocket.write(
    Buffer("fffc01fffc1ffffd01fffd03", "hex"),
    function() {
      console.log('NEGOTIATOR: write done');
      obj._params['telnetState'] = 'prompt';
    });
}


module.exports = Telnet;
