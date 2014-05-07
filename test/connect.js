var telnet = require('../lib/telnet-client');
var nodeunit = require('nodeunit');
var socket;


exports['socket'] = nodeunit.testCase({
  setUp: function(callback) {
    socket = new telnet();
    callback();
  },

  tearDown: function(callback) {
  },

  "connect": function(test) {
    socket.connect({
      // TODO: napravi neki server koji ce glumiti box i pokreni ga u setUp
      host: '10.126.129.195',
      port: 23
    });

    socket.on('connect', function() {
      test.done();
    });
  }
});
