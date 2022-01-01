import { expect } from 'chai'
import { Telnet } from '../src'
import { createServer, Server } from 'net'

let server: Server

describe('server_push', () => {
  before((done) => {
    server = createServer(function (c) {
      c.write(Buffer.from('BusyBox v1.19.2 () built-in shell (ash)\n'
        + "Enter 'help' for a list of built-in commands.\n\n/ # ", 'ascii'))

      setTimeout(function () {
        c.write(Buffer.from('Hello, client!', 'ascii'))
      }, 50)
    })

    server.listen(2323, done)
  })

  after((done) => server.close(done))

  it('receive_pushed_data', (done) => {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      shellPrompt: '/ # ',
      timeout: 1500
    }

    connection.on('data', function (data) {
      connection.end().finally()

      expect(data.toString()).to.equal('Hello, client!')
      done()
    })

    connection.connect(params).finally()
  })
})
