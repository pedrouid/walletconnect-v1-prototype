import path from 'path'
import fastify from 'fastify'
import fastifyStatic from 'fastify-static'
import WebSocket from 'ws'

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

interface ISocketMessage {
  topic: string
  payload: string
}

interface ISocketSub {
  topics: string[]
  socket: WebSocket
}

const subs: ISocketSub[] = []
const pubs: ISocketMessage[] = []

function socketSend (socket: WebSocket, socketMessage: ISocketMessage) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(socketMessage))
  }
}

const SubController = (socket: WebSocket, socketMessage: ISocketMessage) => {
  const topics = JSON.parse(socketMessage.payload)

  const subscriber = {
    socket,
    topics
  }

  subs.push(subscriber)

  const pending = pubs.filter((pendingMessage: ISocketMessage) =>
    topics.includes(pendingMessage.topic)
  )

  if (pending && pending.length) {
    pending.forEach((pendingMessage: ISocketMessage) =>
      socketSend(socket, pendingMessage)
    )
  }
}

const PubController = (socketMessage: ISocketMessage) => {
  const subscribers: ISocketSub[] = subs.filter((subscriber: ISocketSub) => {
    if (subscriber.topics.includes(socketMessage.topic)) {
      return subscriber
    }
  })

  if (subscribers.length) {
    subscribers.forEach((subscriber: ISocketSub) =>
      socketSend(subscriber.socket, socketMessage)
    )
  } else {
    pubs.push(socketMessage)
  }
}

server.ready(() => {
  wsServer.on('connection', (socket: WebSocket) => {
    socket.on('message', async data => {
      const message: string = String(data)

      let socketMessage: ISocketMessage

      if (message) {
        console.log('message =>', message)

        try {
          socketMessage = JSON.parse(message)

          if (!socketMessage.topic.trim()) {
            SubController(socket, socketMessage)
          } else {
            PubController(socketMessage)
          }
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
