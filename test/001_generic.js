const { Telnet } = process.env.NODETELNETCLIENT_COV
    ? require('../lib-cov/index')
    : require('../dist/index')
const nodeunit = require('nodeunit')
const net = require('net')

let session, server, callbackCount

exports['generic'] = nodeunit.testCase({
  setUp: function(callback) {
    session = new Telnet()
    callbackCount = 0

    server = net.createServer(function() {
      callbackCount++
    })

    server.listen(2323, function() {
      callback()
    })
  },

  tearDown: function(callback) {
    server.close(function() {
      callback()
    })
  },

  connect: function(test) {
    session.connect({
      host: '127.0.0.1',
      port: 2323 // not using 23, as that one could require sudo
    }).finally(session.end())

    session.on('connect', function() {
      test.ok(callbackCount === 1, "Client did connect")
      test.done()
    })
  }
})
