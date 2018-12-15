import aesjs from "aes-js";
import createHmac from "hmac";
import randomBytes from "randombytes";
import ethParseUri from "eth-parse-uri";

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

    if (!node && !uri) {
      throw new Error("Missing one of two required parameters: node | uri");
    } else if (node && typeof node !== "string") {
      throw new Error("Invalid node parameter: must be a string");
    } else if (uri && typeof uri !== "string") {
      throw new Error("Invalid uri parameter: must be a string");
    }

    this.node = node;
    this.uri = uri;
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
      this._key = this._generateKey();
      return;
    }
    this._key = value;
  }

  get key() {
    return this._key;
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
      meta = this._meta = this._getMeta();
    }
    return meta;
  }

  get uri() {
    const _uri = this._formatUri();
    return _uri;
  }

  set uri(value) {
    if (!value || typeof value !== "string") {
      throw new Error("Invalid or missing node parameter value");
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
      this.id = this._uuid();
      this.key = this._generateKey();
      this._setLocal();
    }
    return this.toJSON();
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
  _generateKey(s = 256) {
    const n = s / 8;
    const key = randomBytes(n);
    return key;
  }

  _encrypt(data) {
    const key = this.key;

    if (!key) {
      throw new Error("Missing key! Required for encryption");
    }

    const iv = this._generateKey(128);
    const ivHex = aesjs.utils.hex.fromBytes(iv);

    const contentString = this._stringifyJSON(data);

    const content = aesjs.utils.utf8.toBytes(contentString);
    const cipher = new aesjs.ModeOfOperation.cbc(key, iv);
    const cipherText = cipher.encrypt(content);
    const cipherTextHex = aesjs.utils.hex.fromBytes(cipherText);

    const hmac = createHmac(key);
    hmac.update(cipherTextHex);
    hmac.update(ivHex);
    const hmacHex = hmac.digest("hex");

    return {
      data: cipherTextHex,
      hmac: hmacHex,
      iv: ivHex
    };
  }

  _decrypt(payload) {
    const key = this.key;

    if (!key) {
      throw new Error("Missing key! Required for decryption");
    }

    const ivHex = payload.iv;
    const iv = aesjs.utils.hex.toBytes(ivHex);
    const hmacHex = payload.hmac;
    const hmac = aesjs.utils.hex.toBytes(hmacHex);

    const cipherTextHex = payload.data;
    const cipherText = aesjs.utils.hex.toBytes(cipherTextHex);

    const chmac = createHmac(key);
    chmac.update(cipherTextHex);
    chmac.update(ivHex);
    const chmacHex = hmac.digest("hex");

    if (chmacHex !== hmacHex) {
      throw new Error("Failed HMAC test on decryption");
    }

    const cipher = new aesjs.ModeOfOperation.cbc(key, iv);
    const content = cipher.decrypt(cipherText);
    const contentString = aesjs.utils.utf8.fromBytes(content);

    const data = this._parseJSON(contentString);

    return data;
  }

  _formatUri() {
    const id = this.id;
    const version = this.version;
    const node = this.node;
    const key = this.key;
    const _uri = `wc:${id}@${version}?node=${node}&key=${key}`;
    return _uri;
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
      const node = result.bridge;

      if (!result.symKey || typeof result.symKey === "string") {
        throw Error("Invalid or missing key parameter value");
      }
      const key = Buffer.from(result.symKey, "base64");

      return { peerId, node, key };
    } else {
      throw new Error("URI format doesn't follow WalletConnect protocol");
    }
  }

  _openSocket() {
    const node = this.node;

    const socket = new WebSocket(node);

    socket.onopen = function() {
      console.log("WalletConnect session is connected to", node);

      const sessionRequest = this._encrypt(this.meta);

      const payload = JSON.stringify({
        id: this._payloadId(),
        jsonrpc: "2.0",
        method: "wc_sessionRequest",
        params: [this.id, "", sessionRequest]
      });

      socket.send(payload);
    };

    socket.onmessage = function(ev) {
      console.log("Message =>", ev.data);
    };
  }

  _payloadId() {
    var datePart = new Date().getTime() * Math.pow(10, 3);
    var extraPart = Math.floor(Math.random() * Math.pow(10, 3));
    return datePart + extraPart;
  }

  _uuid(a) {
    return a
      ? (a ^ ((Math.random() * 16) >> (a / 4))).toString(16)
      : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, this.uuid);
  }

  _getMeta() {
    function getIcons() {
      let links = document.getElementsByTagName("link");
      let icons = [];

      for (let i = 0; i < links.length; i++) {
        let link = links[i];

        let rel = link.getAttribute("rel");
        if (rel) {
          if (rel.toLowerCase().indexOf("icon") > -1) {
            let href = link.getAttribute("href");

            if (href) {
              if (
                href.toLowerCase().indexOf("https:") === -1 &&
                href.toLowerCase().indexOf("http:") === -1 &&
                href.indexOf("//") !== 0
              ) {
                let absoluteHref =
                  window.location.protocol + "//" + window.location.host;

                if (href.indexOf("/") === 0) {
                  absoluteHref += href;
                } else {
                  let path = window.location.pathname.split("/");
                  path.pop();
                  let finalPath = path.join("/");
                  absoluteHref += finalPath + "/" + href;
                }

                icons.push(absoluteHref);
              } else if (href.indexOf("//") === 0) {
                let absoluteUrl = window.location.protocol + href;

                icons.push(absoluteUrl);
              } else {
                icons.push(href);
              }
            }
          }
        }
      }

      return icons;
    }

    function getMetaOfAny(...args) {
      const metaTags = document.getElementsByTagName("meta");

      for (let i = 0; i < metaTags.length; i++) {
        const attributes = ["itemprop", "property", "name"]
          .map(target => metaTags[i].getAttribute(target))
          .filter(attr => args.includes(attr));

        if (attributes.length && attributes) {
          return metaTags[i].getAttribute("content");
        }
      }

      return "";
    }

    function getName() {
      let name = "";
      name = getMetaOfAny("name", "og:site_name", "og:title", "twitter:title");

      if (!name) {
        name = document.title;
      }

      return name;
    }

    function getDescription() {
      let description = "";
      description = getMetaOfAny(
        "description",
        "og:description",
        "twitter:description",
        "keywords"
      );

      return description;
    }

    const name = getName();
    const decription = getDescription();
    const ssl = window.location.href.startsWith("https");
    const host = window.location.hostname;
    const icons = getIcons();

    return {
      name,
      decription,
      ssl,
      host,
      icons
    };
  }

  _stringifyJSON(data) {
    return JSON.stringify(data);
  }

  _parseJSON(string) {
    let result = null;
    try {
      result = JSON.parse(string);
    } catch (error) {
      throw new Error(`Failed to parse invalid JSON`);
    }
    return result;
  }

  _getLocal() {
    let session = null;
    const local = localStorage.getItem(localStorageId);
    if (local && typeof local === "string") {
      session = this._parseJSON(local);
    }
    return session;
  }

  _setLocal() {
    const session = this.session;
    const local = this._stringifyJSON(session);
    localStorage.setItem(localStorageId, local);
    return session;
  }

  _removeLocal() {
    localStorage.removeItem(localStorageId);
  }
}

export default WalletConnect;
