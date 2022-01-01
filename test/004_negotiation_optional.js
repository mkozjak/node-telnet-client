/* eslint-disable dot-notation */
const { Telnet } = process.env.NODETELNETCLIENT_COV
  ? require('../lib-cov/index')
  : require('../lib/index')
const nodeunit = require('nodeunit')
const telnet_server = require('telnet')

let srv

exports['negotiation_optional'] = nodeunit.testCase({
  setUp: function (callback) {
    srv = telnet_server.createServer(function (c) {
      c.on('data', function () {
        c.write(Buffer.from('Hello, user.\n'))
      })
    })

    srv.listen(2323, function () {
      callback()
    })
  },

  tearDown: function (callback) {
    srv.close(function () {
      callback()
    })
  },

  send_data: function (test) {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      negotiationMandatory: false
    }

    connection.on('connect', function () {
      connection.send('Hello, server.', {
        ors: '\r\n',
        waitfor: '\n'
      }, function (_error, data) {
        test.strictEqual(data?.toString(), 'Hello, user.\r\n')
        test.done()
        connection.end().finally()
      }).finally()
    })

    connection.connect(params).finally()
  },

  send_data_without_options: function (test) {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      negotiationMandatory: false,
      sendTimeout: 100
    }

    connection.on('connect', function () {
      connection.send('Hello, server.', function (_error, data) {
        test.strictEqual(data.toString(), 'Hello, user.\r\n')
        test.done()
        connection.end().finally()
      }).finally()
    })

    connection.connect(params).finally()
  },

  send_data_without_options_promise: function (test) {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      negotiationMandatory: false,
      sendTimeout: 100
    }

    connection.connect(params).then(function () {
      connection.send('Hello, server.').then(function (data) {
        test.strictEqual(data.toString(), 'Hello, user.\r\n')
        test.done()
        connection.end().finally()
      })
    })
  }
})
