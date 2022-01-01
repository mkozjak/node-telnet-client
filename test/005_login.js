/* eslint-disable dot-notation */
const { Telnet } = process.env.NODETELNETCLIENT_COV
  ? require('../lib-cov/index')
  : require('../dist/index')
const nodeunit = require('nodeunit')
const telnet_server = require('telnet')

let srv

exports['login'] = nodeunit.testCase({
  setUp: function (callback) {
    srv = telnet_server.createServer(function (c) {
      let logged_in = false

      c.write(Buffer.from('Enter your username:\n\nUserName:', 'ascii'))

      c.on('data', function (data) {
        if (!logged_in) {
          if (data.toString().replace(/\n$/, '') !== 'andy')
            return c.write(Buffer.from('Invalid username', 'ascii'))
          else
            logged_in = true
        }

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

  ok: function (test) {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      loginPrompt: 'UserName:',
      failedLoginMatch: 'Invalid username',
      username: 'andy',
      shellPrompt: '/ # ',
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
  },

  fail: function (test) {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      loginPrompt: 'UserName:',
      failedLoginMatch: 'Invalid username',
      username: 'andb',
      shellPrompt: '/ # ',
      timeout: 1500
    }

    connection.on('ready', function () {
      connection.exec('uptime', function (_err, resp) {
        connection.end().finally()

        test.strictEqual(resp, '23:14  up 1 day, 21:50, 6 users, load averages: 1.41 1.43 1.41\n')
        test.done()
      }).catch()
    })

    connection.on('failedlogin', function () {
      test.done()
    })

    connection.connect(params).catch(() => {})
  }
})
