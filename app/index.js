const sockets = {}
const payloads = []

// const errors = {
//   parse_error: {
//     code: -32700,
//     message:
//       'Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.'
//   },
//   invalid_request: {
//     code: -32600,
//     message: 'The JSON sent is not a valid Request object.'
//   },
//   method_not_found: {
//     code: -32601,
//     message: 'The method does not exist / is not available.'
//   },
//   invalid_params: {
//     code: -32602,
//     message: 'Invalid method parameter(s).'
//   },
//   internal_error: {
//     code: -32603,
//     message: 'Internal JSON-RPC error.'
//   },
//   server_error: {
//     code: -32000,
//     message: 'Something went wrong'
//   }
// }

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

const app = (socket, payload) => {
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

module.exports = app
