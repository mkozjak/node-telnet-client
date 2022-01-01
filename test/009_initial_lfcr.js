/* eslint-disable dot-notation */
const { Telnet } = process.env.NODETELNETCLIENT_COV
  ? require('../lib-cov/index')
  : require('../dist/index')
const nodeunit = require('nodeunit')
const telnet_server = require('telnet')

let srv

exports['initial_lfcr'] = nodeunit.testCase({
  setUp: function (callback) {
    srv = telnet_server.createServer(function (c) {
      let initialSent = false

      c.on('data', function () {
        if (!initialSent)
          return c.write(Buffer.from('BusyBox v1.19.2 () built-in shell (ash)\n'
            + "Enter 'help' for a list of built-in commands.\n\n/ # ", 'ascii'),
            function () {
              initialSent = true
            })

        c.write(Buffer.from('uptime\r\n23:14  up 1 day, 21:50, 6 users, '
          + 'load averages: 1.41 1.43 1.41\r\n', 'ascii'))
        c.write(Buffer.from('/ # ', 'ascii'))
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

  initial_lfcr: function (test) {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      shellPrompt: '/ # ',
      initialLFCR: true,
      timeout: 1500
    }

    connection.on('ready', function () {
      connection.exec('uptime', function (_err, resp) {
        connection.end().finally()

        test.strictEqual(resp, '23:14  up 1 day, 21:50, 6 users, load averages: 1.41 1.43 1.41\n')
        test.done()
      }).finally()
    })

    connection.connect(params).finally()
  }
})
