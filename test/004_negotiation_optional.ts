import { expect } from 'chai'
import { Telnet } from '../src'
import { createServer, Server } from 'net'

let server: Server

describe('negotiation_optional', () => {
  before((done) => {
    server = createServer(function (c) {
      c.on('data', function () {
        c.write(Buffer.from('Hello, user.\n'))
      })
    })

    server.listen(2323, done)
  })

  after((done) => server.close(done))

  it('send_data', (done) => {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      negotiationMandatory: false
    }

    connection.on('connect', function () {
      connection.send('Hello, server.', {
        ors: '\r\n',
        waitFor: '\n'
      }, function (_error, data) {
        expect(data?.toString()).to.equal('Hello, user.\n')
        connection.end().finally()
        done()
      }).finally()
    })

    connection.connect(params).finally()
  })

  it('send_data_without_options', (done) => {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      negotiationMandatory: false,
      sendTimeout: 100
    }

    connection.on('connect', function () {
      connection.send('Hello, server.', function (_error, data) {
        expect(data?.toString()).to.equal('Hello, user.\n')
        connection.end().finally()
        done()
      }).finally()
    })

    connection.connect(params).finally()
  })

  it('send_data_without_options_promise', (done) => {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      negotiationMandatory: false,
      sendTimeout: 100
    }

    connection.connect(params).then(function () {
      connection.send('Hello, server.').then(function (data) {
        expect(data?.toString()).to.equal('Hello, user.\n')
        connection.end().finally()
        done()
      })
    })
  })
})
