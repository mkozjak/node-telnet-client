var telnet = require('../lib/telnet-client');
var nodeunit = require('nodeunit');
var socket;


exports['socket'] = nodeunit.testCase({
  setUp: function(callback) {
    socket = new telnet();
    callback();
  },
  "connect": function(test) {
    console.log(socket);
    test.done();
  }
});
