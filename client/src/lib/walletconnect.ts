import { decrypt, encrypt, generateKey } from "./crypto";
import {
  IEncryptionPayload,
  ISocketMessage,
  IJSONRPCRequest,
  IClientMeta,
  IEventEmitter,
  IParseURIResult,
  IWalletConnectSession,
  IWalletConnectOptions,
  IWalletConnectJSON
} from "./types";
import {
  convertBufferToHex,
  convertHexToBuffer,
  getMeta,
  payloadId,
  uuid,
  parseWalletConnectUri
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
  private _peerId: string | null;
  private _peerMeta: IClientMeta | null;
  private _handshakeTopic: string | null;
  private _accounts: string[] | null;
  private _chainId: number | null;
  private _socket: WebSocket | null;
  private _queue: ISocketMessage[];
  private _eventEmitters: IEventEmitter[];
  private _connected: boolean;

  constructor(opts: IWalletConnectOptions) {
    this.protocol = "wc";
    this.version = 1;

    this._clientMeta = null;
    this._peerId = null;
    this._peerMeta = null;
    this._handshakeTopic = null;
    this._accounts = null;
    this._chainId = null;
    this._socket = null;
    this._queue = [];
    this._eventEmitters = [];
    this._connected = false;

    if (!opts.node && !opts.uri) {
      throw new Error("Missing one of two required parameters: node | uri");
    }
    if (opts.node) {
      this.node = opts.node;
    }
    if (opts.uri) {
      this.uri = opts.uri;
      this._setToQueue({
        topic: "",
        payload: JSON.stringify([this._handshakeTopic])
      });
    }

    this._registerInternalEvents();
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

  get uri() {
    const _uri = this._formatUri();
    return _uri;
  }

  set uri(value) {
    if (!value) {
      return;
    }
    const { handshakeTopic, node, key } = this._parseUri(value);
    this._handshakeTopic = handshakeTopic;
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
    const session: IWalletConnectSession = {
      accounts: this.accounts || [],
      chainId: this.chainId || null,
      node: this.node,
      key: this.key,
      clientId: this.clientId,
      clientMeta: this.clientMeta,
      peerId: this.peerId || null,
      peerMeta: this.peerMeta || null,
      handshakeTopic: this._handshakeTopic || null
    };
    return session;
  }

  set session(value) {
    return;
  }

  public async init() {
    let session: IWalletConnectSession | null = this._getLocal();
    if (session) {
      this._reconnectSession(session);
    } else {
      if (!this._handshakeTopic) {
        session = await this._createSession();
      }
    }
    this._socketOpen();
    return session;
  }

  public on(
    method: string,
    callback: (error: Error | null, request: any | null) => void
  ): void {
    const eventEmitter = {
      method,
      callback
    };
    this._eventEmitters.push(eventEmitter);
  }

  public toJSON(): IWalletConnectJSON {
    const json: IWalletConnectJSON = {
      node: this.node,
      peerMeta: this.peerMeta || null,
      chainId: this.chainId || null,
      accounts: this.accounts || [],
      uri: this.uri
    };
    return json;
  }

  // -- Private Methods ----------------------------------------------------- //

  private _reconnectSession(session: IWalletConnectSession) {
    this.accounts = session.accounts;
    this.chainId = session.chainId;
    this.node = session.node;
    this.key = session.key;
    this.clientId = session.clientId;
    this.clientMeta = session.clientMeta;
    this.peerId = session.peerId;
    this.peerMeta = session.peerMeta;
    this.handshakeTopic = session.handshakeTopic;
  }

  private async _createSession(): Promise<IWalletConnectSession> {
    this._key = this._key || (await generateKey());

    const sessionRequest: IJSONRPCRequest = {
      id: payloadId(),
      jsonrpc: "2.0",
      method: "wc_sessionRequest",
      params: [this.clientId, this.clientMeta]
    };

    const encryptionPayload = await this._encrypt(sessionRequest);
    const payload = JSON.stringify(encryptionPayload);

    this._handshakeTopic = this._handshakeTopic || uuid();
    const socketMessage = {
      topic: this._handshakeTopic,
      payload
    };

    this._setToQueue(socketMessage);
    const session = this._setLocal();

    return session;
  }

  private async _encrypt(data: IJSONRPCRequest): Promise<IEncryptionPayload> {
    const key: ArrayBuffer = this._key;
    const result: IEncryptionPayload = await encrypt(data, key);
    return result;
  }

  private async _decrypt(
    payload: IEncryptionPayload
  ): Promise<IJSONRPCRequest | null> {
    const key: ArrayBuffer = this._key;
    const result: IJSONRPCRequest | null = await decrypt(payload, key);
    return result;
  }

  private _registerInternalEvents() {
    this.on("wc_sessionRequest", (error, request) => {
      if (error) {
        throw error;
      }
      this.peerId = request.params[0];
      this.peerMeta = request.params[1];
    });

    this.on("wc_sessionStatus", (error, request) => {
      if (error) {
        throw error;
      }
      this._connected = request.params[0];
      this._chainId = request.params[1];
      this._accounts = request.params[2];
    });
  }

  private _formatUri() {
    const protocol = this.protocol;
    const handshakeTopic = this._handshakeTopic;
    const version = this.version;
    const node = encodeURIComponent(this.node);
    const key = this.key;
    const uri = `${protocol}:${handshakeTopic}@${version}?node=${node}&key=${key}`;
    console.log("uri", uri); // tslint:disable-line
    return uri;
  }

  private _parseUri(uri: string) {
    const result: IParseURIResult = parseWalletConnectUri(uri);
    console.log("_parseUri result", result); // tslint:disable-line

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
      console.log("_socketReceive socketMessage", socketMessage); // tslint:disable-line
    } catch (error) {
      throw new Error(`Failed to parse invalid JSON`);
    }

    let encryptionPayload: IEncryptionPayload;
    try {
      encryptionPayload = JSON.parse(socketMessage.payload);
    } catch (error) {
      throw new Error(`Failed to parse invalid JSON`);
    }

    const request: IJSONRPCRequest | null = await this._decrypt(
      encryptionPayload
    );
    console.log("_socketReceive request", request); // tslint:disable-line

    if (request) {
      const method: string = request.method;

      console.log("_socketReceive request.method", request.method); // tslint:disable-line

      const eventEmitters = this._eventEmitters.filter(
        (eventEmitter: IEventEmitter) => eventEmitter.method === method
      );

      console.log("_socketReceive eventEmitters", eventEmitters); // tslint:disable-line

      if (eventEmitters && eventEmitters.length) {
        eventEmitters.forEach((eventEmitter: IEventEmitter) =>
          eventEmitter.callback(null, request)
        );
      }
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
}

export default WalletConnect;
