/* eslint-disable dot-notation */
const { Telnet } = process.env.NODETELNETCLIENT_COV
  ? require('../lib-cov/index')
  : require('../lib/index')
const nodeunit = require('nodeunit')
const telnet_server = require('telnet')

let srv
let interval = null

exports['stress'] = nodeunit.testCase({
  setUp: function (callback) {
    srv = telnet_server.createServer(function (c) {
      c.write(Buffer.from('BusyBox v1.19.2 () built-in shell (ash)\n'
        + "Enter 'help' for a list of built-in commands.\n\n/ # ", 'ascii'))

      c.on('data', function () {
        interval = setInterval(function () {
          c.write(Buffer.alloc(100000, '23r23g32g2g3g'))
        }, 1)
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

  buffer_exceeded: function (test) {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      shellPrompt: '/ # ',
      timeout: 1500,
      maxBufferLength: 2 * 1024 * 1024
    }

    connection.on('ready', function () {
      connection.exec('tailme', function (_error, resp) {
        clearInterval(interval)
        connection.end().finally()

        test.strictEqual(resp?.length ?? -1, 2100000)
        test.done()
      }).finally()
    })

    connection.connect(params).catch(() => {})
  }
})
