var telnet = process.env.NODETELNETCLIENT_COV 
  ? require('../lib-cov/index')
  : require('../lib/index')
var nodeunit = require('nodeunit')
var telnet_server = require('telnet')

var srv
var intv = null

exports['stress'] = nodeunit.testCase({
  setUp: function(callback) {
    srv = telnet_server.createServer(function(c) {
      c.write(new Buffer("BusyBox v1.19.2 () built-in shell (ash)\n"
        + "Enter 'help' for a list of built-in commands.\n\n/ # ", 'ascii'))

      c.on('data', function() {
        intv = setInterval(function() {
          c.write(Buffer.alloc(100000, '23r23g32g2g3g'))
        }, 1)
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

  buffer_exceeded: function(test) {
    var connection = new telnet()

    var params = {
      host: '127.0.0.1',
      port: 2323,
      shellPrompt: '/ # ',
      timeout: 1500,
      maxBufferLength: 2 * 1024 * 1024
    }

    connection.on('ready', function(prompt) {
      connection.exec('tailme', function(error, resp) {
        clearInterval(intv)
        connection.end()

        test.strictEqual(resp.length, 2100000)
        test.done()
      })
    })
    
    connection.connect(params)
  }
})
