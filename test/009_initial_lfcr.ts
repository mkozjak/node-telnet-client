import { expect } from 'chai'
import { Telnet } from '../src'
// @ts-ignore
import telnet_server from 'telnet'

let server: any

describe('initial_lfcr', () => {
  before(done => {
    server = telnet_server.createServer((c: any) => {
      let initialSent = false

      c.on('data', () => {
        if (!initialSent)
          return c.write(Buffer.from('BusyBox v1.19.2 () built-in shell (ash)\n'
            + "Enter 'help' for a list of built-in commands.\n\n/ # ", 'ascii'),
            () => initialSent = true)

        c.write(Buffer.from('uptime\r\n23:14  up 1 day, 21:50, 6 users, '
          + 'load averages: 1.41 1.43 1.41\r\n', 'ascii'))
        c.write(Buffer.from('/ # ', 'ascii'))
      })
    })

    server.listen(2323, done)
  })

  after(done => server.close(done))

  it('initial_lfcr', done => {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      shellPrompt: '/ # ',
      initialLFCR: true,
      timeout: 1500
    }

    connection.on('ready', () => {
      connection.exec('uptime', (_err, resp) => {
        connection.end().finally()

        expect(resp).to.equal('23:14  up 1 day, 21:50, 6 users, load averages: 1.41 1.43 1.41\n')
        done()
      }).finally()
    })

    connection.connect(params).finally()
  })
})
