import path from 'path'
import fastify from 'fastify'
import fastifyStatic from 'fastify-static'
import WebSocket from 'ws'

import bridge from './bridge'

const server = fastify({ logger: process.env.NODE_ENV !== 'production' })

const staticRoot = path.join(__dirname, '../../client/build')
console.log('staticRoot', staticRoot)

server.register(fastifyStatic, {
  root: staticRoot
})
server.get('/', (req, res) => {
  res.sendFile('index.html')
})

const wsServer = new WebSocket.Server({ server: server.server })

server.ready(() => {
  wsServer.on('connection', function (socket) {
    socket.on('message', async function (data) {
      const message = String(data)
      let socketMessage = null
      console.log('message =>', message)
      if (message) {
        try {
          socketMessage = JSON.parse(message)
          bridge(socket, socketMessage)
        } catch (e) {
          console.error(e)
        }
      }
    })
  })
})

const port = Number(process.env.PORT) || 5000

server.listen(port, () => {
  console.log(`Server listening on ${port}`)
})
