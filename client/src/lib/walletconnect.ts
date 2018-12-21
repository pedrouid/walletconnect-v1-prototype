import { decrypt, encrypt, generateKey } from "./crypto";
import {
  IEncryptionPayload,
  ISocketMessage,
  ISessionStatus,
  ISessionError,
  IInternalEvent,
  IRpcResponse,
  ITxData,
  IPartialRpcRequest,
  IFullRpcRequest,
  IClientMeta,
  IEventEmitter,
  IParseURIResult,
  ISessionParams,
  IWalletConnectSession,
  IWalletConnectOptions
} from "./types";
import {
  convertBufferToHex,
  convertHexToBuffer,
  getMeta,
  payloadId,
  uuid,
  parseWalletConnectUri,
  isRpcRequest,
  isRpcResponse,
  isInternalEvent
} from "./utils";

const localStorageId: string = "wcsmngt";
let localStorage: Storage | null = null;

if (
  typeof window !== "undefined" &&
  typeof window.localStorage !== "undefined"
) {
  localStorage = window.localStorage;
}

class WalletConnect {
  private protocol: string;
  private version: number;

  private _node: string;
  private _key: ArrayBuffer;

  private _clientId: string;
  private _clientMeta: IClientMeta | null;
  private _peerId: string;
  private _peerMeta: IClientMeta | null;
  private _handshakeId: number;
  private _handshakeTopic: string;
  private _accounts: string[];
  private _chainId: number;
  private _socket: WebSocket | null;
  private _queue: ISocketMessage[];
  private _eventEmitters: IEventEmitter[];
  private _connected: boolean;

  constructor(opts: IWalletConnectOptions) {
    this.protocol = "wc";
    this.version = 1;

    this._clientId = "";
    this._clientMeta = null;
    this._peerId = "";
    this._peerMeta = null;
    this._handshakeId = 0;
    this._handshakeTopic = "";
    this._accounts = [];
    this._chainId = 0;
    this._socket = null;
    this._queue = [];
    this._eventEmitters = [];
    this._connected = false;

    if (!opts.node && !opts.uri && !opts.session) {
      throw new Error(
        "Missing one of two required parameters: node / uri / session"
      );
    }

    if (opts.node) {
      this.node = opts.node;
    }

    if (opts.uri) {
      this.uri = opts.uri;
      this._setToQueue({
        topic: "",
        payload: JSON.stringify([this.handshakeTopic])
      });
    }

    if (opts.session) {
      this.session = opts.session;
      this._socketOpen();
    }

    this._subscribeToInternalEvents();
  }

  set node(value: string) {
    if (!value) {
      throw new Error("Missing node parameter value");
    }
    this._node = value;
  }

  get node() {
    return this._node;
  }

  set key(value: string) {
    if (!value) {
      return;
    }
    const key: ArrayBuffer = convertHexToBuffer(value);
    this._key = key;
  }

  get key(): string {
    const key: string = convertBufferToHex(this._key);
    return key;
  }

  set clientId(value: string) {
    if (!value) {
      return;
    }
    this._clientId = value;
  }

  get clientId() {
    let clientId: string | null = this._clientId;
    if (!clientId) {
      clientId = this._clientId = uuid();
    }

    return this._clientId;
  }

  set peerId(value) {
    if (!value) {
      return;
    }
    this._peerId = value;
  }

  get peerId() {
    return this._peerId;
  }

  set clientMeta(value) {
    return;
  }

  get clientMeta() {
    let clientMeta: IClientMeta | null = this._clientMeta;
    if (!clientMeta || !Object.keys(clientMeta).length) {
      clientMeta = this._clientMeta = getMeta();
    }
    return clientMeta;
  }

  set peerMeta(value) {
    this._peerMeta = value;
  }

  get peerMeta() {
    const peerMeta: IClientMeta | null = this._peerMeta;
    return peerMeta;
  }

  set handshakeTopic(value) {
    if (!value) {
      return;
    }
    this._handshakeTopic = value;
  }

  get handshakeTopic() {
    return this._handshakeTopic;
  }

  set handshakeId(value) {
    if (!value) {
      return;
    }
    this._handshakeId = value;
  }

  get handshakeId() {
    return this._handshakeId;
  }

  get uri() {
    const _uri = this._formatUri();
    return _uri;
  }

  set uri(value) {
    if (!value) {
      return;
    }
    const { handshakeTopic, node, key } = this._parseUri(value);
    this.handshakeTopic = handshakeTopic;
    this.node = node;
    this.key = key;
  }

  set chainId(value) {
    this._chainId = value;
  }

  get chainId() {
    const chainId: number | null = this._chainId;
    return chainId;
  }

  set accounts(value) {
    this._accounts = value;
  }

  get accounts() {
    const accounts: string[] | null = this._accounts;
    return accounts;
  }

  set connected(value) {
    return;
  }

  get connected() {
    return this._connected;
  }

  get session() {
    return {
      connected: this.connected,
      accounts: this.accounts,
      chainId: this.chainId,
      node: this.node,
      key: this.key,
      clientId: this.clientId,
      clientMeta: this.clientMeta,
      peerId: this.peerId,
      peerMeta: this.peerMeta,
      handshakeId: this.handshakeId,
      handshakeTopic: this.handshakeTopic
    };
  }

  set session(value) {
    this._connected = value.connected;
    this.accounts = value.accounts;
    this.chainId = value.chainId;
    this.node = value.node;
    this.key = value.key;
    this.clientId = value.clientId;
    this.clientMeta = value.clientMeta;
    this.peerId = value.peerId;
    this.peerMeta = value.peerMeta;
    this.handshakeId = value.handshakeId;
    this.handshakeTopic = value.handshakeTopic;
  }

  public async init() {
    let session: IWalletConnectSession | null = this._getLocal();
    if (session) {
      this._reconnectSession(session);
    } else {
      if (!this.handshakeTopic) {
        session = await this._createSession();
      }
    }
    this._socketOpen();
    return session;
  }

  public on(
    event: string,
    callback: (error: Error | null, payload: any | null) => void
  ): void {
    const eventEmitter = {
      event,
      callback
    };
    this._eventEmitters.push(eventEmitter);
  }

  public approveSession(sessionStatus: ISessionStatus) {
    if (this._connected) {
      throw new Error("Session currently connected");
    }

    this.chainId = sessionStatus.chainId;
    this.accounts = sessionStatus.accounts;

    const sessionParams: ISessionParams = {
      approved: true,
      chainId: this.chainId,
      accounts: this.accounts,
      peerId: this.clientId,
      peerMeta: this.clientMeta,
      message: null
    };

    const response = {
      id: this.handshakeId,
      jsonrpc: "2.0",
      result: sessionParams
    };

    this._sendResponse(response);

    this._connected = true;
    this._triggerEvents({
      event: "connect",
      params: [
        {
          peerId: this.peerId,
          peerMeta: this.peerMeta,
          chainId: this.chainId,
          accounts: this.accounts
        }
      ]
    });
    this._setLocal();
  }

  public rejectSession(sessionError?: ISessionError) {
    if (this._connected) {
      throw new Error("Session currently connected");
    }

    const message = sessionError ? sessionError.message : null;

    const sessionParams: ISessionParams = {
      approved: false,
      chainId: null,
      accounts: null,
      peerId: null,
      peerMeta: null,
      message
    };

    const response = {
      id: this.handshakeId,
      jsonrpc: "2.0",
      result: sessionParams
    };

    this._sendResponse(response);

    this._connected = false;
    this._triggerEvents({
      event: "disconnect",
      params: [{ message }]
    });
    this._removeLocal();
  }

  public updateSession(sessionStatus: ISessionStatus) {
    if (!this._connected) {
      throw new Error("Session currently disconnected");
    }

    this.chainId = sessionStatus.chainId;
    this.accounts = sessionStatus.accounts;

    const sessionParams: ISessionParams = {
      approved: true,
      chainId: this.chainId,
      accounts: this.accounts,
      message: null
    };

    const request = this._formatRequest({
      method: "wc_sessionUpdate",
      params: [sessionParams]
    });

    this._sendSessionRequest(request, "Session update rejected");

    this._triggerEvents({
      event: "session_update",
      params: [
        {
          chainId: this.chainId,
          accounts: this.accounts
        }
      ]
    });
    this._setLocal();
  }

  public killSession(sessionError?: ISessionError) {
    if (!this._connected) {
      throw new Error("Session currently disconnected");
    }

    const message = sessionError ? sessionError.message : null;

    const sessionParams: ISessionParams = {
      approved: false,
      chainId: null,
      accounts: null,
      message
    };

    const request = this._formatRequest({
      method: "wc_sessionUpdate",
      params: [sessionParams]
    });

    this._sendSessionRequest(request, "Session kill rejected");

    this._connected = false;

    this._triggerEvents({
      event: "disconnect",
      params: [{ message }]
    });

    this._removeLocal();
  }

  public async sendTransaction(tx: ITxData) {
    if (!this._connected) {
      throw new Error("Session currently disconnected");
    }

    const request = this._formatRequest({
      method: "eth_sendTransaction",
      params: [tx]
    });

    try {
      const result = await this._sendCallRequest(request);
      return result;
    } catch (error) {
      throw error;
    }
  }

  public async signMessage(params: any[]) {
    if (!this._connected) {
      throw new Error("Session currently disconnected");
    }

    const request = this._formatRequest({
      method: "eth_sign",
      params
    });

    try {
      const result = await this._sendCallRequest(request);
      return result;
    } catch (error) {
      throw error;
    }
  }

  public async signTypedData(params: any[]) {
    if (!this._connected) {
      throw new Error("Session currently disconnected");
    }

    const request = this._formatRequest({
      method: "eth_signTypedData",
      params
    });

    try {
      const result = await this._sendCallRequest(request);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // -- Private Methods ----------------------------------------------------- //

  private async _sendRequest(request: IPartialRpcRequest, _topic?: string) {
    const callRequest: IFullRpcRequest = this._formatRequest(request);

    const encryptionPayload: IEncryptionPayload = await this._encrypt(
      callRequest
    );

    const topic: string = _topic ? _topic : this.peerId;

    const payload: string = JSON.stringify(encryptionPayload);

    const socketMessage = {
      topic,
      payload
    };

    if (this._socket) {
      this._socketSend(socketMessage);
    } else {
      this._setToQueue(socketMessage);
    }
  }

  private async _sendResponse(response: IRpcResponse, _topic?: string) {
    const encryptionPayload: IEncryptionPayload = await this._encrypt(response);

    const payload: string = JSON.stringify(encryptionPayload);

    const topic: string = _topic ? _topic : this.peerId;

    const socketMessage = {
      topic,
      payload
    };

    if (this._socket) {
      this._socketSend(socketMessage);
    } else {
      this._setToQueue(socketMessage);
    }
  }

  private async _sendSessionRequest(
    request: IFullRpcRequest,
    errorMsg: string
  ) {
    this._sendRequest(request);
    this._subscribeToSessionResponse(request.id, errorMsg);
  }

  private _sendCallRequest(request: IFullRpcRequest): Promise<any> {
    this._sendRequest(request);
    return this._subscribeToCallResponse(request.id);
  }

  private _reconnectSession(session: IWalletConnectSession) {
    this.session = session;
    this._subscribeToSessionResponse(
      this.handshakeId,
      "Session request rejected"
    );
  }

  private async _createSession(): Promise<IWalletConnectSession> {
    this._key = this._key || (await generateKey());

    const sessionRequest: IFullRpcRequest = this._subscribeToSessionRequest();

    this.handshakeTopic = this.handshakeTopic || uuid();

    this._sendRequest(sessionRequest, this.handshakeTopic);

    const session = this._setLocal();

    return session;
  }

  private _formatRequest(request: IPartialRpcRequest): IFullRpcRequest {
    const sessionRequest: IFullRpcRequest = {
      id: payloadId(),
      jsonrpc: "2.0",
      ...request
    };
    return sessionRequest;
  }

  private _subscribeToSessionRequest(): IFullRpcRequest {
    const sessionRequest: IFullRpcRequest = this._formatRequest({
      method: "wc_sessionRequest",
      params: [
        {
          peerId: this.clientId,
          peerMeta: this.clientMeta
        }
      ]
    });

    this._handshakeId = sessionRequest.id;

    this._subscribeToSessionResponse(
      this._handshakeId,
      "Session request rejected"
    );

    return sessionRequest;
  }

  private _handleSessionResponse(
    sessionParams: ISessionParams,
    errorMsg: string
  ) {
    if (sessionParams.approved) {
      if (!this._connected) {
        this._connected = true;
        if (sessionParams.peerId) {
          this.peerId = sessionParams.peerId;
        }
        if (sessionParams.peerMeta) {
          this.peerMeta = sessionParams.peerMeta;
        }
        if (sessionParams.chainId) {
          this.chainId = sessionParams.chainId;
        }
        if (sessionParams.accounts) {
          this.accounts = sessionParams.accounts;
        }

        this._triggerEvents({
          event: "connect",
          params: [
            {
              peerId: this.peerId,
              peerMeta: this.peerMeta,
              chainId: this.chainId,
              accounts: this.accounts
            }
          ]
        });
      } else {
        if (sessionParams.chainId) {
          this.chainId = sessionParams.chainId;
        }
        if (sessionParams.accounts) {
          this.accounts = sessionParams.accounts;
        }

        this._triggerEvents({
          event: "session_update",
          params: [
            {
              chainId: this.chainId,
              accounts: this.accounts
            }
          ]
        });
      }
      this._setLocal();
    } else {
      if (this._connected) {
        this._connected = false;
        const message = sessionParams.message || errorMsg;
        this._triggerEvents({
          event: "disconnect",
          params: [{ message }]
        });
        console.error(message); // tslint:disable-line
      }
      this._removeLocal();
    }
  }

  private _subscribeToSessionResponse(id: number, errorMsg: string) {
    this.on(`response:${id}`, (error: Error, payload: IRpcResponse) => {
      if (error) {
        console.error(errorMsg); // tslint:disable-line
      }

      this._handleSessionResponse(payload.result, errorMsg);
    });
  }

  private _subscribeToCallResponse(id: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.on(`response:${id}`, (error: Error, payload: IRpcResponse) => {
        if (error) {
          reject(error);
        }
        if (payload.result) {
          resolve(payload.result);
        } else {
          reject(new Error("Invalid JSON RPC response format received"));
        }
      });
    });
  }

  private _subscribeToInternalEvents() {
    this.on("wc_sessionRequest", (error, payload) => {
      if (error) {
        console.error(error); // tslint:disable-line
      }
      this._handshakeId = payload.id;
      this.peerId = payload.params[0].peerId;
      this.peerMeta = payload.params[0].peerMeta;

      this._triggerEvents({
        event: "session_request",
        params: [{ peerId: this.peerId, peerMeta: this.peerMeta }]
      });
    });

    this.on("wc_sessionUpdate", (error, payload) => {
      if (error) {
        console.error(error); // tslint:disable-line
      }
      this._handleSessionResponse(payload.params[0], "Session disconnected");
    });
  }

  private _setToQueue(socketMessage: ISocketMessage) {
    this._queue.push(socketMessage);
  }

  private _dispatchQueue() {
    const queue = this._queue;

    queue.forEach((socketMessage: ISocketMessage) =>
      this._socketSend(socketMessage)
    );

    this._queue = [];
  }

  private _socketOpen() {
    const node = this.node;

    const url = node.startsWith("https")
      ? node.replace("https", "wss")
      : node.startsWith("http")
      ? node.replace("http", "ws")
      : node;

    const socket = new WebSocket(url);

    socket.onopen = () => {
      this._setToQueue({
        topic: "",
        payload: JSON.stringify([this.clientId])
      });

      this._dispatchQueue();
    };

    socket.onmessage = (event: MessageEvent) => this._socketReceive(event);

    this._socket = socket;
  }

  private _socketSend(socketMessage: ISocketMessage) {
    const socket: WebSocket | null = this._socket;

    if (!socket) {
      throw new Error("Missing socket: required for sending message");
    }
    const message: string = JSON.stringify(socketMessage);

    socket.send(message);
  }

  private async _socketReceive(event: MessageEvent) {
    let socketMessage: ISocketMessage;
    try {
      socketMessage = JSON.parse(event.data);
    } catch (error) {
      throw new Error(`Failed to parse invalid JSON`);
    }

    let encryptionPayload: IEncryptionPayload;
    try {
      encryptionPayload = JSON.parse(socketMessage.payload);
    } catch (error) {
      throw new Error(`Failed to parse invalid JSON`);
    }

    const payload: IFullRpcRequest | IRpcResponse | null = await this._decrypt(
      encryptionPayload
    );

    if (payload) {
      this._triggerEvents(payload);
    }
  }

  private _triggerEvents(
    payload: IFullRpcRequest | IRpcResponse | IInternalEvent
  ): void {
    let eventEmitters: IEventEmitter[] = [];
    let event: string;

    if (isRpcRequest(payload)) {
      event = payload.method;
    } else if (isRpcResponse(payload)) {
      event = `response:${payload.id}`;
    } else if (isInternalEvent) {
      event = payload.event;
    } else {
      event = "";
    }

    if (event) {
      eventEmitters = this._eventEmitters.filter(
        (eventEmitter: IEventEmitter) => eventEmitter.event === event
      );
    }

    if (!eventEmitters || !eventEmitters.length) {
      eventEmitters = this._eventEmitters.filter(
        (eventEmitter: IEventEmitter) => eventEmitter.event === "request"
      );
    }
    eventEmitters.forEach((eventEmitter: IEventEmitter) =>
      eventEmitter.callback(null, payload)
    );
  }

  private async _encrypt(
    data: IFullRpcRequest | IRpcResponse
  ): Promise<IEncryptionPayload> {
    const key: ArrayBuffer = this._key;
    const result: IEncryptionPayload = await encrypt(data, key);
    return result;
  }

  private async _decrypt(
    payload: IEncryptionPayload
  ): Promise<IFullRpcRequest | IRpcResponse | null> {
    const key: ArrayBuffer = this._key;
    const result: IFullRpcRequest | IRpcResponse | null = await decrypt(
      payload,
      key
    );
    return result;
  }

  private _formatUri() {
    const protocol = this.protocol;
    const handshakeTopic = this.handshakeTopic;
    const version = this.version;
    const node = encodeURIComponent(this.node);
    const key = this.key;
    const uri = `${protocol}:${handshakeTopic}@${version}?node=${node}&key=${key}`;
    return uri;
  }

  private _parseUri(uri: string) {
    const result: IParseURIResult = parseWalletConnectUri(uri);

    if (result.protocol === this.protocol) {
      if (!result.handshakeTopic) {
        throw Error("Invalid or missing handshakeTopic parameter value");
      }
      const handshakeTopic = result.handshakeTopic;

      if (!result.node) {
        throw Error("Invalid or missing node url parameter value");
      }
      const node = decodeURIComponent(result.node);

      if (!result.key) {
        throw Error("Invalid or missing kkey parameter value");
      }
      const key = result.key;

      return { handshakeTopic, node, key };
    } else {
      throw new Error("URI format doesn't follow WalletConnect protocol");
    }
  }

  private _getLocal(): IWalletConnectSession | null {
    let session = null;
    const local = localStorage ? localStorage.getItem(localStorageId) : null;
    if (local && typeof local === "string") {
      try {
        session = JSON.parse(local);
      } catch (error) {
        throw new Error(`Failed to parse invalid JSON`);
      }
    }
    return session;
  }

  private _setLocal(): IWalletConnectSession {
    const session: IWalletConnectSession = this.session;
    const local: string = JSON.stringify(session);
    if (localStorage) {
      localStorage.setItem(localStorageId, local);
    }
    return session;
  }

  private _removeLocal(): void {
    if (localStorage) {
      localStorage.removeItem(localStorageId);
    }
  }
}

export default WalletConnect;
