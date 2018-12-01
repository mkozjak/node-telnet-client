var telnet = process.env.NODETELNETCLIENT_COV 
  ? require('../lib-cov/index')
  : require('../lib/index')
var nodeunit = require('nodeunit')
var telnet_server = require('telnet')

var srv

exports['prompt_same_line'] = nodeunit.testCase({
  setUp: function(callback) {
    srv = telnet_server.createServer(function(c) {
      logged_in = false

      c.write(new Buffer("KDS6-client001D56042A56 login: ", 'ascii'))

      c.on('data', function(data) {
        if (!logged_in) {
          if (data.toString().replace(/\n$/, '') !== 'root')
            return c.write(new Buffer('Invalid username', 'ascii'))
          else {
            logged_in = true
            return c.write(new Buffer('/ # ', 'ascii'))
          }
        }

        c.write(new Buffer("astparam g ch_select\r\n0002/ # ", 'ascii'))
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

  prompt_same_line: function(test) {
    var connection = new telnet()

    var params = {
      host: '127.0.0.1',
      port: 2323,
      loginPrompt: 'KDS6-client001D56042A56 login: ',
      failedLoginMatch: 'Invalid username',
      username: 'root',
      shellPrompt: '/ # ',
      timeout: 1500
    }

    connection.on('ready', function(prompt) {
      connection.exec('astparam g ch_select', function(err, resp) {
        connection.end()

        test.strictEqual(resp, '0002')
        test.done()
      })
    })

    connection.connect(params)
  }
})
