import { expect } from 'chai'
import { Telnet } from '../src'
import { createServer, Server } from 'net'

let connection: Telnet
let server: Server
let callbackCount: number

describe('generic', () => {
  before((done) => {
    connection = new Telnet()
    callbackCount = 0
    server = createServer(() => callbackCount++)
    server.listen(2323, done)
  })

  after(function (done) {
    this.timeout(3000)
    server.close(done)
  })

  it('connect', (done) => {
    connection.connect({
      host: '127.0.0.1',
      port: 2323 // not using 23, as that one could require sudo
    }).finally(() => connection.end())

    connection.on('connect', () => {
      expect(callbackCount).to.equal(1, 'Client did connect')
      done()
    })
  })
})
