import { decrypt, encrypt, generateKey } from "./crypto";
import {
  IEncryptionPayload,
  ISocketPayload,
  IJSONRPCRequest,
  IClientMeta,
  IParseURIResult,
  IWalletConnectSession,
  IWalletConnectOptions,
  IWalletConnectJSON
} from "./types";
import {
  convertBufferToHex,
  convertHexToBuffer,
  getMeta,
  parseJSON,
  payloadId,
  stringifyJSON,
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
  private _id: string;
  private _peerId: string | null;
  private _meta: IClientMeta | null;
  private _peerMeta: IClientMeta | null;
  private _topic: string | null;
  private _accounts: string[] | null;
  private _chainId: number | null;
  private _socket: WebSocket | null;

  constructor(opts: IWalletConnectOptions) {
    this.protocol = "wc";
    this.version = 1;

    this._meta = null;
    this._peerMeta = null;
    this._accounts = null;
    this._chainId = null;
    this._socket = null;

    if (!opts.node && !opts.uri) {
      throw new Error("Missing one of two required parameters: node | uri");
    }
    if (opts.node) {
      this.node = opts.node;
    }
    if (opts.uri) {
      this.uri = opts.uri;
    }
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

  set id(value: string) {
    if (!value) {
      return;
    }
    this._id = value;
  }

  get id() {
    return this._id;
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

  set meta(value) {
    return;
  }

  get meta() {
    let meta: IClientMeta | null = this._meta;
    if (!meta || !Object.keys(meta).length) {
      meta = this._meta = getMeta();
    }
    return meta;
  }

  set peerMeta(value) {
    this._peerMeta = value;
  }

  get peerMeta() {
    const peerMeta: IClientMeta | null = this._peerMeta;
    return peerMeta;
  }

  set topic(value) {
    if (!value) {
      return;
    }
    this._topic = value;
  }

  get topic() {
    return this._topic;
  }

  get uri() {
    const _uri = this._formatUri();
    return _uri;
  }

  set uri(value) {
    if (!value) {
      return;
    }
    const { topic, node, key } = this._parseUri(value);
    this.topic = topic;
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

  get session() {
    const session: IWalletConnectSession = {
      accounts: this.accounts || [],
      chainId: this.chainId || null,
      node: this.node,
      key: this.key,
      id: this.id,
      meta: this.meta,
      peerId: this.peerId || null,
      peerMeta: this.peerMeta || null
    };
    return session;
  }

  set session(value) {
    return;
  }

  public async init() {
    let socketPayload: ISocketPayload | null = null;
    let session: IWalletConnectSession | null = this._getLocal();
    if (session) {
      this.node = session.node;
      this.id = session.id;
      this.peerId = session.peerId;
      this.peerMeta = session.peerMeta;
      this.chainId = session.chainId;
      this.accounts = session.accounts;
      this.key = session.key;
    } else {
      const id = uuid();
      this.id = id;
      const meta = this.meta;
      this._key = await generateKey();
      session = this._setLocal();
      const request: IJSONRPCRequest = {
        id: payloadId(),
        jsonrpc: "2.0",
        method: "wc_sessionRequest",
        params: [id, meta]
      };
      const payload = await this._encrypt(request);
      const topic = uuid();
      this.topic = topic;
      socketPayload = {
        topic,
        payload
      };
    }
    this._socketOpen(socketPayload);
    return session;
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

  private async _encrypt(data: IJSONRPCRequest) {
    const key = this._key;
    const result = await encrypt(data, key);
    return result;
  }

  private async _decrypt(payload: IEncryptionPayload) {
    const key = this._key;
    const result = await decrypt(payload, key);
    return result;
  }

  private _formatUri() {
    const protocol = this.protocol;
    const topic = this.topic;
    const version = this.version;
    const node = encodeURIComponent(this.node);
    const key = this.key;
    const uri = `${protocol}:${topic}@${version}?node=${node}&key=${key}`;
    return uri;
  }

  private _parseUri(uri: string) {
    const result: IParseURIResult = parseWalletConnectUri(uri);
    if (result.protocol === "protocol") {
      if (!result.topic || typeof result.topic === "string") {
        throw Error("Invalid or missing topic parameter value");
      }
      const topic = result.topic;

      if (!result.node || typeof result.node === "string") {
        throw Error("Invalid or missing node url parameter value");
      }
      const node = decodeURIComponent(result.node);

      if (!result.key || typeof result.key === "string") {
        throw Error("Invalid or missing kkey parameter value");
      }
      const key = result.key;

      return { topic, node, key };
    } else {
      throw new Error("URI format doesn't follow WalletConnect protocol");
    }
  }

  private _socketOpen(socketPayload: ISocketPayload | null = null) {
    const node = this.node;

    const url = node.startsWith("https")
      ? node.replace("https", "wss")
      : node.startsWith("http")
      ? node.replace("http", "ws")
      : node;

    const socket = new WebSocket(url);

    socket.onopen = () => {
      if (socketPayload) {
        this._socketSend(socketPayload);
      }
    };

    socket.onmessage = this._socketReceive;

    this._socket = socket;
  }

  private _socketSend(socketPayload: ISocketPayload) {
    const socket: WebSocket | null = this._socket;

    if (!socket) {
      throw new Error("Missing socket: required for sending message");
    }
    const message: string = stringifyJSON(socketPayload);

    socket.send(message);
  }

  private async _socketReceive(event: MessageEvent) {
    const socketPayload: IEncryptionPayload = parseJSON(event.data.payload);
    const request: IJSONRPCRequest | null = await this._decrypt(socketPayload);
    if (request) {
      console.log("message", request); // tslint:disable-line
    }
  }

  private _getLocal(): IWalletConnectSession | null {
    let session = null;
    const local = localStorage ? localStorage.getItem(localStorageId) : null;
    if (local && typeof local === "string") {
      session = parseJSON(local);
    }
    return session;
  }

  private _setLocal(): IWalletConnectSession {
    const session: IWalletConnectSession = this.session;
    const local: string = stringifyJSON(session);
    if (localStorage) {
      localStorage.setItem(localStorageId, local);
    }
    return session;
  }

  // private _removeLocal(): void {
  //   if (localStorage) {
  //     localStorage.removeItem(localStorageId);
  //   }
  // }
}

export default WalletConnect;
