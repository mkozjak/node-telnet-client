import { expect } from 'chai'
import { Telnet } from '../src'
// @ts-ignore
import telnet_server from 'telnet'

let server: any
let interval: any = null

describe('stress', () => {
  before((done) => {
    server = telnet_server.createServer((c: any) => {
      c.write(Buffer.from('BusyBox v1.19.2 () built-in shell (ash)\n'
        + "Enter 'help' for a list of built-in commands.\n\n/ # ", 'ascii'))

      c.on('data', () => {
        interval = setInterval(function () {
          c.write(Buffer.alloc(100000, '23r23g32g2g3g'))
        }, 1)
      })
    })

    server.listen(2323, done)
  })

  after((done) => server.close(done))

  it('buffer_exceeded', (done) => {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      shellPrompt: '/ # ',
      timeout: 1500,
      maxBufferLength: 2 * 1024 * 1024,
      maxEndWait: 300
    }

    connection.on('ready', function () {
      connection.exec('tailme', function (_error, resp) {
        clearInterval(interval)
        connection.end().finally()

        expect(resp?.length ?? -1).to.equal(2100000)
        done()
      }).finally()
    })

    connection.connect(params).catch(() => {})
  })
})
