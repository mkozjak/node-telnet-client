var telnet = process.env.NODETELNETCLIENT_COV 
  ? require('../lib-cov/index')
  : require('../lib/index')
var nodeunit = require('nodeunit')
var telnet_server = require('telnet')

var srv

exports['initial_lfcr'] = nodeunit.testCase({
  setUp: function(callback) {
    srv = telnet_server.createServer(function(c) {
      var initialSent = false

      c.on('data', function() {
        if (!initialSent)
          return c.write(new Buffer("BusyBox v1.19.2 () built-in shell (ash)\n"
            + "Enter 'help' for a list of built-in commands.\n\n/ # ", 'ascii'),
            function() {
              initialSent = true
            })

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

  initial_lfcr: function(test) {
    var connection = new telnet()

    var params = {
      host: '127.0.0.1',
      port: 2323,
      shellPrompt: '/ # ',
      initialLFCR: true,
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
  }
})
