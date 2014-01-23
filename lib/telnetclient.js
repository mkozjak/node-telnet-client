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

Telnet.prototype.close = function() {
  this.telnetSocket.destroy();
}

function parser(chunk, telnetObj) {
  var promptIndex = '';

  if (telnetObj.params['telnetState'] === 'start' && chunk[0] === 255 &&
      chunk[1] === 253 && chunk[2] === 1 && chunk[3] === 255 &&
      chunk[4] === 253 && chunk[5] === 31) {
    console.log('PARSER: go negotiate!');

    telnetObj.params['telnetState'] = 'negotiate';
    telnetObj.params['stringData'] = '';

    // TODO: choose if you want to negotiate
    negotiate(telnetObj);
  }
  else if (telnetObj.params['telnetState'] === 'getprompt') {
    var stringData = chunk.toString();
    promptIndex = stringData.search(telnetObj.params.prompt);

    if (promptIndex != -1) {
      console.log('PARSER: PROMPT - "%s"', stringData.substring(promptIndex));

      telnetObj.params['telnetState'] = 'sendcmd';
      telnetObj.params['stringData'] = '';
      telnetObj.emit('ready');
    }
    else {
      console.log('PARSER: prompt not matched, saving data');

      telnetObj.params['stringData'] += stringData;
    }
  }
  else if (telnetObj.params['telnetState'] === 'response') {
    var stringData = chunk.toString();
    telnetObj.params['stringData'] += stringData;
    promptIndex = stringData.search(telnetObj.params.prompt);

    if (promptIndex != -1) {
      var array = telnetObj.params['stringData'].split('\n');

      if (telnetObj.params['willEcho'] == 1) array.shift();
      array.pop();

      console.log('PARSER: RESPONSE -', array);
      telnetObj.telnetSocket.end();
    }
  }
}

function negotiate(telnetObj) {
  telnetObj.telnetSocket.write(
    // TODO: probaj sa DON'T ECHO ili WILL ECHO
    Buffer("fffc01fffc1ffffd01fffd03", "hex"),
    function() {
      console.log('NEGOTIATOR: write done');
      telnetObj.params['telnetState'] = 'getprompt';
    });
}


module.exports = Telnet;
