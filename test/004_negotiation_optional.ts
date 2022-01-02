import { expect } from 'chai'
import { Telnet } from '../src'
import { createServer, Server, Socket } from 'net'

let server: Server

describe('negotiation_optional', () => {
  before(done => {
    server = createServer((c: Socket) => {
      c.on('data', () => {
        c.write(Buffer.from('Hello, user.\n'))
      })
    })

    server.listen(2323, done)
  })

  after(done => server.close(done))

  it('send_data', done => {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      negotiationMandatory: false
    }

    connection.on('connect', () => {
      connection.send('Hello, server.', {
        ors: '\r\n',
        waitFor: '\n'
      }, (_error, data) => {
        expect(data?.toString()).to.equal('Hello, user.\n')
        connection.end().finally()
        done()
      }).finally()
    })

    connection.connect(params).finally()
  })

  it('send_data_without_options', done => {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      negotiationMandatory: false,
      sendTimeout: 100
    }

    connection.on('connect', () => {
      connection.send('Hello, server.', (_error, data) => {
        expect(data?.toString()).to.equal('Hello, user.\n')
        connection.end().finally()
        done()
      }).finally()
    })

    connection.connect(params).finally()
  })

  it('send_data_without_options_promise', done => {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      negotiationMandatory: false,
      sendTimeout: 100
    }

    connection.connect(params).then(() => {
      connection.send('Hello, server.').then(data => {
        expect(data?.toString()).to.equal('Hello, user.\n')
        connection.end().finally()
        done()
      })
    })
  })
})
