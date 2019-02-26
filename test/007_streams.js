var telnet = process.env.NODETELNETCLIENT_COV
  ? require('../lib-cov/index')
  : require('../lib/index')
var nodeunit = require('nodeunit')
var telnet_server = require('telnet')

var srv

exports['streams'] = nodeunit.testCase({
  setUp: function(callback) {
    srv = telnet_server.createServer(function(c) {
      c.write(new Buffer("BusyBox v1.19.2 () built-in shell (ash)\n"
        + "Enter 'help' for a list of built-in commands.\n\n/ # ", 'ascii'))

      c.on('data', function(data) {
        if (data.toString().indexOf('uptime\n') !== -1) {
          c.write(new Buffer("23:14  up 1 day, 21:50, 6 users, "
            + "load averages: 1.41 1.43 1.41\r\n", 'ascii'))
          c.write(new Buffer("/ # ", 'ascii'))
        }
        else if (data.toString().indexOf('df\n') !== -1) {
          c.write(new Buffer("/dev/disk1     112Gi   87Gi   25Gi    78% 1913034 4293054245    0%   /\r\n", 'ascii'))
          c.write(new Buffer("/ # ", 'ascii'))
        }
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

  shell: function(test) {
    var connection = new telnet()

    var params = {
      host: '127.0.0.1',
      port: 2323,
      shellPrompt: '/ # ',
      timeout: 1500
    }

    connection.on('ready', function() {
      connection.shell(function(error, stream) {
        buffered = ''

        expected = 'uptime\n23:14  up 1 day, 21:50, 6 users, load averages: 1.41 1.43 1.41\r\n/ # df\n/dev/disk1     112Gi   87Gi   25Gi    78% 1913034 4293054245    0%   /\r\n/ # '

        var cb = (data) => buffered += data.toString()
        stream.on('data', cb)

        setTimeout(() => stream.write('uptime\n'), 100)
        setTimeout(() => stream.write('df\n'), 200)

        setTimeout(() => {
          stream.removeListener('data', cb)
          connection.end().then(() => {
            test.equals(error, null)
            test.equals(buffered, expected)
            test.done()
          })
        }, 250)
      })
    })

    connection.connect(params)
  }
})
