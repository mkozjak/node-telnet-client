var telnet = process.env.NODETELNETCLIENT_COV 
  ? require('../lib-cov/index')
  : require('../lib/index')
var nodeunit = require('nodeunit')
var net = require('net')

var socket, server, callbackCount

exports['generic'] = nodeunit.testCase({
  setUp: function(callback) {
    socket = new telnet()
    callbackCount = 0

    server = net.createServer(function(c) {
      callbackCount++
      c.end()
    })

    server.listen(2323, function(err) {
      callback()
    })
  },

  tearDown: function(callback) {
    server.close(function() {
      callback()
    })
  },

  connect: function(test) {
    socket.connect({
      host: '127.0.0.1',
      port: 2323 // not using 23, as that one could require sudo
    })

    socket.on('connect', function() {
      test.ok(callbackCount == 1, "Client did connect")
      test.done()
    })
  }
})
