import ethParseUri from "eth-parse-uri";

import {
  payloadId,
  uuid,
  getMeta,
  stringifyJSON,
  parseJSON,
  convertBufferToHex,
  convertHexToBuffer
} from "./utils";
import { generateKey, encrypt, decrypt } from "./crypto";

const localStorageId = "wcsmngt";
let localStorage = null;

if (
  typeof window !== "undefined" &&
  typeof window.localStorage !== "undefined"
) {
  localStorage = window.localStorage;
}

class WalletConnect {
  constructor({ node, uri }) {
    this.protocol = "wc";
    this.version = 1;
    this.connected = false;

    if (!node && !uri) {
      throw new Error("Missing one of two required parameters: node | uri");
    }
    if (node) {
      this.node = node;
    }
    if (uri) {
      this.uri = uri;
    }
  }

  set id(value) {
    if (!value) {
      return;
    }
    this._id = value;
  }

  get id() {
    return this._id;
  }

  set key(value) {
    if (!value) {
      return;
    }
    const key = convertHexToBuffer(value);
    this._key = key;
  }

  get key() {
    const key = convertBufferToHex(this._key);
    return key;
  }

  set node(value) {
    if (!value || typeof value !== "string") {
      throw new Error("Invalid or missing node parameter value");
    }
    this._node = value;
  }

  get node() {
    return this._node;
  }

  set meta(value) {
    return;
  }

  get meta() {
    let meta = this._meta;
    if (!meta || typeof meta !== "object" || !Object.keys(meta).length) {
      meta = this._meta = getMeta();
    }
    return meta;
  }

  get uri() {
    const _uri = this._formatUri();
    return _uri;
  }

  set uri(value) {
    if (!value || typeof value !== "string") {
      return;
    }
    const { peerId, node, key } = this._parseUri(value);
    this.peerId = peerId;
    this.node = node;
    this.key = key;
  }

  get session() {
    return {
      node: this.node,
      id: this.id,
      peerId: this.peerId || null,
      peerMeta: this.peerMeta || {},
      chainId: this.chainId || null,
      accounts: this.accounts || [],
      key: this.key
    };
  }

  set session(value) {
    return;
  }

  async init() {
    let session = this._getLocal();
    if (session) {
      this.node = session.node;
      this.id = session.id;
      this.peerId = session.peerId;
      this.peerMeta = session.peerMeta;
      this.chainId = session.chainId;
      this.accounts = session.accounts;
      this.key = session.key;
      return session;
    } else {
      this.id = uuid();
      this._key = await generateKey();
      this._setLocal();
    }
    this._openSocket();
  }

  toJSON() {
    return {
      node: this.node,
      peerMeta: this.peerMeta || {},
      chainId: this.chainId || null,
      accounts: this.accounts || [],
      uri: this.uri
    };
  }

  // -- Private Methods ----------------------------------------------------- //

  _encrypt(data) {
    const key = this._key;

    console.log("_encrypt key", key);

    return encrypt(data, key);
  }

  _decrypt(payload) {
    const key = this._key;

    console.log("_decrypt key", key);

    return decrypt(payload, key);
  }

  _formatUri() {
    const id = this.id;
    const version = this.version;
    const node = encodeURIComponent(this.node);
    const key = this.key;
    const uri = `wc:${id}@${version}?node=${node}&key=${key}`;
    return uri;
  }

  _parseUri(uri) {
    const result = ethParseUri(uri);
    if (result.protocol === "protocol") {
      if (!result.sessionId || typeof result.sessionId === "string") {
        throw Error("Invalid or missing peerId parameter value");
      }
      const peerId = result.sessionId;

      if (!result.bridge || typeof result.bridge === "string") {
        throw Error("Invalid or missing node url parameter value");
      }
      const node = decodeURIComponent(result.bridge);

      if (!result.symKey || typeof result.symKey === "string") {
        throw Error("Invalid or missing key parameter value");
      }
      const key = result.symKey;

      return { peerId, node, key };
    } else {
      throw new Error("URI format doesn't follow WalletConnect protocol");
    }
  }

  _openSocket() {
    const node = this.node;

    const url = node.startsWith("https")
      ? node.relace("https", "wss")
      : node.startsWith("http")
        ? node.relace("http", "ws")
        : node;

    const socket = new WebSocket(url);

    socket.onopen = () => {
      console.log("[walletconnect.js] WebSocket open at", url);
      const sessionRequest = this._encrypt(this.meta);
      console.log("[walletconnect.js] sessionRequest", sessionRequest);

      const payload = JSON.stringify({
        id: payloadId(),
        jsonrpc: "2.0",
        method: "wc_sessionRequest",
        params: [this.id, "", sessionRequest]
      });
      console.log("[walletconnect.js] payload", "payload");

      socket.send(payload);
    };

    this.socket = socket;
  }

  _getLocal() {
    let session = null;
    const local = localStorage.getItem(localStorageId);
    if (local && typeof local === "string") {
      session = parseJSON(local);
    }
    return session;
  }

  _setLocal() {
    const session = this.session;
    const local = stringifyJSON(session);
    localStorage.setItem(localStorageId, local);
    return session;
  }

  _removeLocal() {
    localStorage.removeItem(localStorageId);
  }
}

export default WalletConnect;
