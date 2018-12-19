import WebSocket from 'ws'

interface ISocketMessage {
  topic: string
  event: string
  payload: string
}

interface ISocketSub {
  topics: string[]
  socket: WebSocket
}

interface ISocketSubDict {
  [clientId: string]: ISocketSub
}

const subs: ISocketSubDict = {}
const pubs: ISocketMessage[] = []

function socketSend (socket: WebSocket, socketMessage: ISocketMessage) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(socketMessage))
  }
}

const SubController = (socket: WebSocket, socketMessage: ISocketMessage) => {
  const clientId = socketMessage.topic
  let topics = [clientId]
  const payload = socketMessage.payload ? JSON.parse(socketMessage.payload) : []

  if (payload && payload.length) {
    topics = [...topics, ...payload]
  }

  let subscriber: ISocketSub = subs[clientId]

  if (subscriber) {
    subscriber.topics = topics
  } else {
    subscriber = {
      topics,
      socket
    }
  }

  subs[clientId] = subscriber

  const pending = pubs.filter((pendingMessage: ISocketMessage) =>
    topics.includes(pendingMessage.topic)
  )

  if (pending && pending.length) {
    pending.forEach((pendingMessage: ISocketMessage) =>
      socketSend(subscriber.socket, pendingMessage)
    )
  }
}

const PubController = (socketMessage: ISocketMessage) => {
  const subscribers: ISocketSub[] = []

  Object.keys(subs).forEach((clientId: string) => {
    const subscriber = subs[clientId]

    if (subscriber.topics.includes(socketMessage.topic)) {
      subscribers.push(subscriber)
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

const Bridge = (socket: WebSocket, socketMessage: ISocketMessage) => {
  switch (socketMessage.event) {
    case 'sub':
      SubController(socket, socketMessage)
      break
    case 'pub':
      PubController(socketMessage)
      break
    default:
      const errorMessage = {
        topic: socketMessage.topic,
        event: 'err',
        payload: 'Invalid Message Event Type'
      }
      socketSend(socket, errorMessage)
  }
}

export default Bridge
