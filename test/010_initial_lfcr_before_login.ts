import { expect } from 'chai'
import { Telnet } from '../src'
// @ts-ignore
import telnet_server from 'telnet'

let server: any

describe('initial_lfcr_before_login', () => {
  before((done) => {
    server = telnet_server.createServer((c: any) => {
      let state = 'init'
      let usernameOk = false
      let passwordOk = false

      c.on('data', (data: any) => {
        if (passwordOk) {
          c.write(Buffer.from('uptime\r\n23:14  up 1 day, 21:50, 6 users, '
            + 'load averages: 1.41 1.43 1.41\r\n', 'ascii'))
          c.write(Buffer.from('/ # ', 'ascii'))
          return
        }

        if (!usernameOk) {
          if (state === 'init')
            return c.write(Buffer.from('Username: ', 'ascii'),
              function () {
                state = 'username'
              })

          if (state === 'username' && data.toString().trim() === 'foo') {
            usernameOk = true

            return c.write(Buffer.from('Password: ', 'ascii'),
              function () {
                state = 'password'
              })
          }
        }

        if (!passwordOk && data.toString().trim() === 'bar') {
          passwordOk = true

          c.write(Buffer.from('BusyBox v1.19.2 () built-in shell (ash)\n'
            + "Enter 'help' for a list of built-in commands.\n\n/ # ", 'ascii'))
        }
      })
    })

    server.listen(2323, done)
  })

  after((done) => server.close(done))

  it('initial_lfcr_before_login', (done) => {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      shellPrompt: '/ # ',
      loginPrompt: 'Username: ',
      passwordPrompt: 'Password: ',
      username: 'foo',
      password: 'bar',
      initialLFCR: true,
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
})
