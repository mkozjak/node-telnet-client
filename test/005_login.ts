import { expect } from 'chai'
import { Telnet } from '../src'
import { createServer, Server, Socket } from 'net'

let server: Server

describe('login', () => {
  before((done) => {
    server = createServer((c: Socket) => {
      let logged_in = false

      c.write(Buffer.from('Enter your username:\n\nUserName:', 'ascii'))

      c.on('data', (data) => {
        if (!logged_in) {
          if (data.toString().replace(/\n$/, '') !== 'andy') {
            c.write(Buffer.from('Invalid username', 'ascii'))
            return
          }
          else
            logged_in = true
        }

        c.write(Buffer.from('uptime\r\n23:14  up 1 day, 21:50, 6 users, '
          + 'load averages: 1.41 1.43 1.41\r\n', 'ascii'))
        c.write(Buffer.from('/ # ', 'ascii'))
      })
    })

    server.listen(2323, done)
  })

  after((done) => server.close(done))

  it('ok', (done) => {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      loginPrompt: 'UserName:',
      failedLoginMatch: 'Invalid username',
      username: 'andy',
      shellPrompt: '/ # ',
      timeout: 1500
    }

    connection.on('ready', function () {
      connection.exec('uptime', function (_err, resp) {
        connection.end().finally()

        expect(resp).to.equal('23:14  up 1 day, 21:50, 6 users, load averages: 1.41 1.43 1.41\n')
        done()
      }).finally()
    })

    connection.connect(params).finally()
  })

  it('fail', (done) => {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      loginPrompt: 'UserName:',
      failedLoginMatch: 'Invalid username',
      username: 'andb',
      shellPrompt: '/ # ',
      timeout: 1500
    }

    connection.on('ready', function () {
      connection.exec('uptime', function (_err, resp) {
        connection.end().finally()

        expect(resp).to.equal('23:14  up 1 day, 21:50, 6 users, load averages: 1.41 1.43 1.41\n')
        done()
      }).catch(() => {})
    })

    connection.on('failedlogin', () => done())
    connection.connect(params).catch(() => {})
  })
})
