/* eslint-disable dot-notation */
const { Telnet } = process.env.NODETELNETCLIENT_COV
  ? require('../lib-cov/index')
  : require('../lib/index')
const nodeunit = require('nodeunit')
const net = require('net')

let connection, server, callbackCount

exports['generic'] = nodeunit.testCase({
  setUp: function (callback) {
    connection = new Telnet()
    callbackCount = 0

    server = net.createServer(function () {
      callbackCount++
    })

    server.listen(2323, function () {
      callback()
    })
  },

  tearDown: function (callback) {
    server.close(function () {
      callback()
    })
  },

  connect: function (test) {
    connection.connect({
      host: '127.0.0.1',
      port: 2323 // not using 23, as that one could require sudo
    }).finally(connection.end())

    connection.on('connect', function () {
      test.ok(callbackCount === 1, 'Client did connect')
      test.done()
    })
  }
})
