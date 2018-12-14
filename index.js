const path = require('path')
const fastify = require('fastify')
const fastifyStatic = require('fastify-static')
const WebSocketServer = require('ws').Server

const port =
  process.env.PORT || process.env.NODE_ENV === 'production' ? 5000 : 3000
const server = fastify({ logger: process.env.NODE_ENV !== 'production' })
const staticRoot = path.join(__dirname, 'public')
const wsServer = new WebSocketServer({ server: server.server })
const app = require('./app')

server.register(fastifyStatic, {
  root: staticRoot
})
server.get('/', (req, res) => {
  res.sendFile('index.html')
})

server.ready(() => {
  wsServer.on('connection', function (socket) {
    socket.on('message', async function (message) {
      let payload = null

      if (message) {
        try {
          payload = JSON.parse(message)
          app(socket, payload)
        } catch (e) {
          console.error(e)
        }
      }
    })
  })
})

server.listen(port, () => {
  console.log(`Server listening on ${port}`)
})
