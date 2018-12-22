import path from 'path'
import fastify from 'fastify'
import fastifyStatic from 'fastify-static'
import WebSocket from 'ws'

const server = fastify({ logger: process.env.NODE_ENV !== 'production' })

const staticRoot = path.join(__dirname, '../../client/build')

server.register(fastifyStatic, {
  root: staticRoot
})
server.get('/', (req, res) => {
  res.sendFile('index.html')
})

const wsServer = new WebSocket.Server({ server: server.server })

interface ISocketMessage {
  topic: string
  type: string
  payload: string
}

interface ISocketSub {
  topic: string
  socket: WebSocket
}

const subs: ISocketSub[] = []
const pubs: ISocketMessage[] = []

const setSub = (subscriber: ISocketSub) => subs.push(subscriber)
const getSub = (topic: string) =>
  subs.filter(subscriber => subscriber.topic === topic)

const setPub = (socketMessage: ISocketMessage) => pubs.push(socketMessage)
const getPub = (topic: string) =>
  pubs.filter(pending => pending.topic === topic)

function socketSend (socket: WebSocket, socketMessage: ISocketMessage) {
  if (socket.readyState === 1) {
    console.log('OUT =>', socketMessage)
    socket.send(JSON.stringify(socketMessage))
  }
}

const SubController = (socket: WebSocket, socketMessage: ISocketMessage) => {
  const topic = socketMessage.topic

  const subscriber = { topic, socket }

  setSub(subscriber)

  const pending = getPub(topic)

  if (pending && pending.length) {
    pending.forEach((pendingMessage: ISocketMessage) =>
      socketSend(socket, pendingMessage)
    )
  }
}

const PubController = (socketMessage: ISocketMessage) => {
  const subscribers = getSub(socketMessage.topic)

  if (subscribers.length) {
    subscribers.forEach((subscriber: ISocketSub) =>
      socketSend(subscriber.socket, socketMessage)
    )
  } else {
    setPub(socketMessage)
  }
}

server.ready(() => {
  wsServer.on('connection', (socket: WebSocket) => {
    socket.on('message', async data => {
      const message: string = String(data)

      if (message) {
        let socketMessage: ISocketMessage

        try {
          socketMessage = JSON.parse(message)

          console.log('IN  =>', socketMessage)

          if (socketMessage.type === 'sub') {
            SubController(socket, socketMessage)
          } else if (socketMessage.type === 'pub') {
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
