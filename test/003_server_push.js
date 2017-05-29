var telnet = process.env.NODETELNETCLIENT_COV 
  ? require('../lib-cov/index')
  : require('../lib/index')
var nodeunit = require('nodeunit')
var telnet_server = require('telnet')

var srv

exports['server_push'] = nodeunit.testCase({
  setUp: function(callback) {
    srv = telnet_server.createServer(function(c) {
      c.write(new Buffer("BusyBox v1.19.2 () built-in shell (ash)\n"
        + "Enter 'help' for a list of built-in commands.\n\n/ # ", 'ascii'))

      setTimeout(function() {
        c.write(new Buffer("Hello, client!", 'ascii'))
      }, 50)
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

  receive_pushed_data: function(test) {
    var connection = new telnet()

    var params = {
      host: '127.0.0.1',
      port: 2323,
      shellPrompt: '/ # ',
      timeout: 1500
    }

    connection.on('data', function(data) {
      connection.end()

      test.strictEqual(data.toString(), 'Hello, client!')
      test.done()
    })

    connection.connect(params)
  }
})
