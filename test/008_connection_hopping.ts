import { expect } from 'chai'
import { Telnet } from '../src'
// @ts-ignore
import telnet_server from 'telnet'

let server: any

describe('connection_hopping', () => {
  before((done) => {
    server = telnet_server.createServer((c: any) => {
      c.write(Buffer.from('BusyBox v1.19.2 () built-in shell (ash)\n'
        + "Enter 'help' for a list of built-in commands.\n\n/ # ", 'ascii'))

      c.on('data', () => {
        c.write(Buffer.from('uptime\r\n23:14  up 1 day, 21:50, 6 users, '
          + 'load averages: 1.41 1.43 1.41\r\n', 'ascii'))
        c.write(Buffer.from('/ # ', 'ascii'))
      })
    })

    server.listen(2323, done)
  })

  after((done) => server.close(done))

  it('connection_hopping', (done) => {
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

            expect(resp).to.equal('23:14  up 1 day, 21:50, 6 users, load averages: 1.41 1.43 1.41\n')
            done()
          })
        })
    })

    c1.connect(params).finally()
  })
})
