import { expect } from 'chai'
import { ConnectOptions, Telnet } from '../src'
// @ts-ignore
import telnet_server from 'telnet'

let server: any

describe('encoding', () => {
  before(done => {
    server = telnet_server.createServer((c: any) => {
      c.on('data', () => {
        c.write(Buffer.from('Fahrvergnügen\r\n', 'utf8'))
      })
    })

    server.listen(2323, done)
  })

  after(done => server.close(done))

  it('utf8', done => {
    const connection = new Telnet()
    const params: ConnectOptions = {
      host: '127.0.0.1',
      port: 2323,
      shellPrompt: null,
      timeout: 1500,
      encoding: 'utf8'
    }

    connection.connect(params).then(() => {
      connection.send('foo', (_err, resp) => {
        connection.end().finally()

        expect(resp).to.equal('Fahrvergnügen\r\n')
        done()
      }).finally()
    })
  })

  it('latin1', done => {
    const connection = new Telnet()
    const params: ConnectOptions = {
      host: '127.0.0.1',
      port: 2323,
      shellPrompt: null,
      timeout: 1500,
      encoding: 'latin1',
      newlineReplace: '\n'
    }

    connection.connect(params).then(() => {
      connection.send('foo', (_err, resp) => {
        connection.end().finally()

        expect(resp).to.equal('Fahrvergn\u00C3\u00BCgen\n')
        done()
      }).finally()
    })
  })
})
