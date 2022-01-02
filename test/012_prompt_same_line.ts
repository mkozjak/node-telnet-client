import { expect } from 'chai'
import { Telnet } from '../src'
// @ts-ignore
import telnet_server from 'telnet'

let server: any

describe('prompt_same_line', () => {
  before(done => {
    server = telnet_server.createServer((c: any) => {
      let logged_in = false

      c.write(Buffer.from('KDS6-client001D56042A56 login: ', 'ascii'))

      c.on('data', (data: any) => {
        if (!logged_in) {
          if (data.toString().replace(/\n$/, '') !== 'root')
            return c.write(Buffer.from('Invalid username', 'ascii'))
          else {
            logged_in = true
            return c.write(Buffer.from('/ # ', 'ascii'))
          }
        }

        c.write(Buffer.from('astparam g ch_select\r\n0002/ # ', 'ascii'))
      })
    })

    server.listen(2323, done)
  })

  after(done => server.close(done))

  it('prompt_same_line', done => {
    const connection = new Telnet()
    const params = {
      host: '127.0.0.1',
      port: 2323,
      loginPrompt: 'KDS6-client001D56042A56 login: ',
      failedLoginMatch: 'Invalid username',
      username: 'root',
      shellPrompt: '/ # ',
      timeout: 1500
    }

    connection.on('ready', () => {
      connection.exec('astparam g ch_select', (_err, resp) => {
        connection.end().finally()

        expect(resp).to.equal('0002')
        done()
      }).finally()
    })

    connection.connect(params).finally()
  })
})
