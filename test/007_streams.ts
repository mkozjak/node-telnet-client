import { expect } from 'chai'
import { Telnet } from '../src'
// @ts-ignore
import telnet_server from 'telnet'

let server: any

describe('streams', () => {
  before((done) => {
    server = telnet_server.createServer((c: any) => {
      c.write(Buffer.from('BusyBox v1.19.2 () built-in shell (ash)\n'
        + "Enter 'help' for a list of built-in commands.\n\n/ # ", 'ascii'))

      c.on('data', function (data: any) {
        if (data.toString().indexOf('uptime\n') !== -1) {
          c.write(Buffer.from('23:14  up 1 day, 21:50, 6 users, '
            + 'load averages: 1.41 1.43 1.41\r\n', 'ascii'))
          c.write(Buffer.from('/ # ', 'ascii'))
        }
        else if (data.toString().indexOf('df\n') !== -1) {
          c.write(Buffer.from('/dev/disk1     112Gi   87Gi   25Gi    78% 1913034 4293054245    0%   /\r\n', 'ascii'))
          c.write(Buffer.from('/ # ', 'ascii'))
        }
      })
    })

    server.listen(2323, done)
  })

  after((done) => server.close(done))

  it('shell', (done) => {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      shellPrompt: '/ # ',
      timeout: 1500
    }

    connection.on('ready', function () {
      connection.shell(function (error, stream) {
        let buffered = ''
        const expected = '23:14  up 1 day, 21:50, 6 users, load averages: 1.41 1.43 1.41\r\n/ # /dev/disk1     112Gi   87Gi   25Gi    78% 1913034 4293054245    0%   /\r\n/ # '
        const cb = (data: any): string => buffered += data.toString()
        stream.on('data', cb)

        setTimeout(() => stream.write('uptime\n'), 100)
        setTimeout(() => stream.write('df\n'), 200)
        setTimeout(() => {
          stream.removeListener('data', cb)
          connection.end().then(() => {
            expect(error).to.be.null
            expect(buffered).to.equal(expected)
            done()
          })
        }, 250)
      })
    })

    connection.connect(params).finally()
  })
})
