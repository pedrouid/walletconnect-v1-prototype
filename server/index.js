const path = require('path')
const fastify = require('fastify')
const fastifyStatic = require('fastify-static')
const WebSocketServer = require('ws').Server

const server = fastify({ logger: process.env.NODE_ENV !== 'production' })

const staticRoot = path.join(__dirname, '../client/build')
console.log('staticRoot', staticRoot)

server.register(fastifyStatic, {
  root: staticRoot
})
server.get('/', (req, res) => {
  res.sendFile('index.html')
})

const wsServer = new WebSocketServer({ server: server.server })
const relayer = require('./relayer')

server.ready(() => {
  wsServer.on('connection', function (socket) {
    socket.on('message', async function (message) {
      let payload = null
      console.log('message =>', message)
      if (message) {
        try {
          payload = JSON.parse(message)
          relayer(socket, payload)
        } catch (e) {
          console.error(e)
        }
      }
    })
  })
})

const port = process.env.PORT || 5000

server.listen(port, () => {
  console.log(`Server listening on ${port}`)
})
