import { expect } from 'chai'
import { ConnectOptions, Telnet } from '../src'
// @ts-ignore
import telnet_server from 'telnet'

let server: any

describe('next_data', () => {
  before(done => {
    server = telnet_server.createServer((c: any) => {
      c.on('data', () => {
        for (let i = 0; i < 10; ++i)
          c.write(Buffer.from(i.toString() + '\r\n'))
      })
    })

    server.listen(2323, done)
  })

  after(done => server.close(done))

  it('next_data', done => {
    const connection = new Telnet()
    const params: ConnectOptions = {
      host: '127.0.0.1',
      port: 2323,
      shellPrompt: null,
      timeout: 1500
    }

    connection.on('data', data => {
      if (data.toString().includes('9'))
        connection.end().finally()
    })

    connection.connect(params).then(() => {
      connection.send('foo', async () => {
        let count = 0
        let line: string | null

        while ((line = await connection.nextData()))
          expect(Number(line.trim())).to.equal(count++)

        done()
      }).finally()
    })
  })
})
