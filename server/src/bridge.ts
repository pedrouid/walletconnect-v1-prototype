import WebSocket from 'ws'

interface ISocketPayload {
  topic: string
  payload: string
}

interface ISocketDict {
  [id: string]: WebSocket
}

const sockets: ISocketDict = {}
const pendingPayloads: ISocketPayload[] = []

function sendPayload (socket: WebSocket, socketPayload: ISocketPayload) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(socketPayload))
  }
}

function findSocket (id: string): WebSocket | null {
  if (Object.keys(sockets).includes(id)) {
    return sockets[id]
  } else {
    return null
  }
}

const bridge = (socket: WebSocket, socketPayload: ISocketPayload) => {
  if (socketPayload.payload.toLowerCase().startsWith('subscribe')) {
    if (!findSocket(socketPayload.topic)) {
      sockets[socketPayload.topic] = socket
    }
    pendingPayloads
      .filter(
        (pendingPayloads: ISocketPayload) =>
          pendingPayloads.topic === socketPayload.topic
      )
      .forEach((pendingPayloads: ISocketPayload) => {
        sendPayload(socket, pendingPayloads)
      })
  } else {
    const receiver = findSocket(socketPayload.topic)
    if (receiver) {
      sendPayload(receiver, socketPayload)
    } else {
      pendingPayloads.push(socketPayload)
    }
  }
}

export default bridge
