/* eslint-disable dot-notation */
const { Telnet } = process.env.NODETELNETCLIENT_COV
  ? require('../lib-cov/index')
  : require('../lib/index')
const nodeunit = require('nodeunit')
const telnet_server = require('telnet')

let srv

exports['connection_hopping'] = nodeunit.testCase({
  setUp: function (callback) {
    srv = telnet_server.createServer(function (c) {
      c.write(Buffer.from('BusyBox v1.19.2 () built-in shell (ash)\n'
        + "Enter 'help' for a list of built-in commands.\n\n/ # ", 'ascii'))

      c.on('data', function () {
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

  connection_hopping: function (test) {
    const c1 = new Telnet()
    const c2 = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      shellPrompt: '/ # ',
      timeout: 1500
    }

    c1.on('ready', function () {
      c2.connect({
        sock: c1.getSocket(),
        shellPrompt: '/ # ',
      })
        .then(() => {
          c2.exec('uptime', function (_err, resp) {
            c2.end()

            test.strictEqual(resp, '23:14  up 1 day, 21:50, 6 users, load averages: 1.41 1.43 1.41\n')
            test.done()
          })
        })
    })

    c1.connect(params).finally()
  }
})
