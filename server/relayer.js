// const errors = require('./errors')

const sockets = {}
const payloads = []

// function sendError (socket, payloadId, errorRef) {
//   const payload = {
//     id: payloadId,
//     jsonrpc: '2.0',
//     ...errors[errorRef]
//   }
//   sendPayload(socket, payload)
// }

function sendPayload (socket, data) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(data))
  }
}

function findSocket (id) {
  const ids = Object.keys(sockets)
  if (ids.includes(id)) {
    return sockets[id]
  } else {
    return null
  }
}

const relayer = (socket, payload) => {
  const senderId = payload.params[0]
  if (!findSocket(senderId)) {
    sockets[senderId] = socket
  }
  if (payload.method === 'wc_connect') {
    payloads
      .filter(payload => payload.params[1] === senderId)
      .forEach(payload => {
        sendPayload(socket, payload)
      })
  } else if (payload.method === 'wc_disconnect') {
    delete sockets[senderId]
  } else {
    const receiverId = payload.params[1]
    if (findSocket(receiverId)) {
      const receiver = sockets[receiverId]
      sendPayload(receiver, payload)
    } else {
      payloads.push(payload)
    }
  }
}

module.exports = relayer
