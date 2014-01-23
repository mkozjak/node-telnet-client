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
  this.response = '';
  this.params = opts;
  var self = this;

  console.log('MODULE: connecting to %s with %s', opts.host, opts.prompt);

  // create socket and store user data in 'params' object
  this.telnetSocket = net.createConnection({
    port: opts.port,
    host: opts.host
  }, function() {
    self.params['telnetState'] = 'start';
    self.params['stringData'] = '';
    console.log('MODULE: connected!');
  });

  this.telnetSocket.on('data', function(data) {
    // console.log('data okinut, state je %s, a stringData ima %s',
    //   self.params['telnetState'], self.params['stringData']);

    parser(data, self);
  });

  this.telnetSocket.on('end', function() {
    console.log('MODULE: socket end triggered!');
    self.emit('end');
  });

  this.telnetSocket.on('close', function() {
    console.log('MODULE: socket close triggered!');
    self.emit('close');
  });
}

Telnet.prototype.setTimeout = function(msecs, callback) {
  // reuse 'net' lib's setTimeout()
  this.telnetSocket.setTimeout(msecs, callback);
}

Telnet.prototype.exec = function(cmd, callback) {
  var self = this;
  console.log('MODULE: exec - sending to %s:%s',
      this.telnetSocket.remoteAddress, this.telnetSocket.remotePort);

  this.telnetSocket.write(cmd, function() {
    if (callback) callback('MODULE: msg sent!');
    self.params['telnetState'] = 'response';
  });
}

Telnet.prototype.lose = function() {
  this.telnetSocket.destroy();
}

function parser(chunk, obj) {
  var promptIndex = '';

  if (obj.params['telnetState'] === 'start' && chunk[0] === 255 &&
      chunk[1] === 253 && chunk[2] === 1 && chunk[3] === 255 &&
      chunk[4] === 253 && chunk[5] === 31) {
    console.log('PARSER: go negotiate!');

    obj.params['telnetState'] = 'negotiate';
    obj.params['stringData'] = '';

    negotiate(obj);
  }
  else if (obj.params['telnetState'] === 'prompt') {
    var stringData = chunk.toString();
    promptIndex = stringData.search(obj.params.prompt);

    if (promptIndex != -1) {
      console.log('PARSER: PROMPT - "%s"', stringData.substring(promptIndex));

      obj.params['telnetState'] = 'sendcmd';
      obj.params['stringData'] = '';
      obj.emit('ready');
    }
    else {
      console.log('PARSER: prompt not matched, saving data');

      obj.params['stringData'] += stringData;
    }
  }
  else if (obj.params['telnetState'] === 'response') {
    var stringData = chunk.toString();
    obj.params['stringData'] += stringData;
    promptIndex = stringData.search(obj.params.prompt);

    if (promptIndex != -1) {
      var array = obj.params['stringData'].split('\n');

      if (obj.params['willEcho'] == 1) array.shift();
      array.pop();

      console.log('PARSER: RESPONSE -', array);
      obj.telnetSocket.end();
    }
  }
}

function negotiate(obj) {
  obj.telnetSocket.write(
    Buffer("fffc01fffc1ffffd01fffd03", "hex"),
    function() {
      console.log('NEGOTIATOR: write done');
      obj.params['telnetState'] = 'prompt';
    });
}


module.exports = Telnet;
