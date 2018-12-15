module.exports = {
  parse_error: {
    code: -32700,
    message:
      'Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.'
  },
  invalid_request: {
    code: -32600,
    message: 'The JSON sent is not a valid Request object.'
  },
  method_not_found: {
    code: -32601,
    message: 'The method does not exist / is not available.'
  },
  invalid_params: {
    code: -32602,
    message: 'Invalid method parameter(s).'
  },
  internal_error: {
    code: -32603,
    message: 'Internal JSON-RPC error.'
  },
  server_error: {
    code: -32000,
    message: 'Something went wrong'
  }
}
