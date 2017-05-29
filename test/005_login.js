var telnet = process.env.NODETELNETCLIENT_COV 
  ? require('../lib-cov/index')
  : require('../lib/index')
var nodeunit = require('nodeunit')
var telnet_server = require('telnet')

var srv

exports['login'] = nodeunit.testCase({
  setUp: function(callback) {
    srv = telnet_server.createServer(function(c) {
      logged_in = false

      c.write(new Buffer("Enter your username:\n\nUserName:", 'ascii'))

      c.on('data', function(data) {
        if (!logged_in) {
          if (data.toString().replace(/\n$/, '') !== 'andy')
            return c.write(new Buffer('Invalid username', 'ascii'))
          else
            logged_in = true
        }

        c.write(new Buffer("uptime\r\n23:14  up 1 day, 21:50, 6 users, "
          + "load averages: 1.41 1.43 1.41\r\n", 'ascii'))
        c.write(new Buffer("/ # ", 'ascii'))
      })
    })
    
    srv.listen(2323, function() {
      callback()
    })
  },

  tearDown: function(callback) {
    srv.close(function() {
      callback()
    })
  },

  ok: function(test) {
    var connection = new telnet()

    var params = {
      host: '127.0.0.1',
      port: 2323,
      loginPrompt: 'UserName:',
      failedLoginMatch: 'Invalid username',
      username: 'andy',
      shellPrompt: '/ # ',
      timeout: 1500
    }

    connection.on('ready', function(prompt) {
      connection.exec('uptime', function(err, resp) {
        connection.end()

        test.strictEqual(resp, '23:14  up 1 day, 21:50, 6 users, load averages: 1.41 1.43 1.41\n')
        test.done()
      })
    })

    connection.connect(params)
  },

  fail: function(test) {
    var connection = new telnet()

    var params = {
      host: '127.0.0.1',
      port: 2323,
      loginPrompt: 'UserName:',
      failedLoginMatch: 'Invalid username',
      username: 'andb',
      shellPrompt: '/ # ',
      timeout: 1500
    }

    connection.on('ready', function(prompt) {
      connection.exec('uptime', function(err, resp) {
        connection.end()

        test.strictEqual(resp, '23:14  up 1 day, 21:50, 6 users, load averages: 1.41 1.43 1.41\n')
        test.done()
      })
    })

    connection.on('failedlogin', function() {
      test.done()
    })

    connection.connect(params)
  }
})
