import {
  IClientMeta,
  IRequiredParamsResult,
  IQueryParamsResult,
  IParseURIResult,
  IFullRpcRequest,
  IRpcResponse,
  IInternalEvent
} from "./types";

export function concatBuffers(...args: ArrayBuffer[]): ArrayBuffer {
  const hex: string = args.map(b => convertBufferToHex(b)).join("");
  const result: ArrayBuffer = convertHexToBuffer(hex);
  return result;
}

export function convertBufferToUtf8(buffer: ArrayBuffer): string {
  const array: Uint8Array = new Uint8Array(buffer);
  const chars: string[] = [];
  let i: number = 0;

  while (i < array.length) {
    const byte: number = array[i];
    if (byte < 128) {
      chars.push(String.fromCharCode(byte));
      i++;
    } else if (byte > 191 && byte < 224) {
      chars.push(
        String.fromCharCode(((byte & 0x1f) << 6) | (array[i + 1] & 0x3f))
      );
      i += 2;
    } else {
      chars.push(
        String.fromCharCode(
          ((byte & 0x0f) << 12) |
            ((array[i + 1] & 0x3f) << 6) |
            (array[i + 2] & 0x3f)
        )
      );
      i += 3;
    }
  }

  const utf8: string = chars.join("");
  return utf8;
}

export function convertUtf8ToBuffer(utf8: string): ArrayBuffer {
  const bytes: number[] = [];

  let i = 0;
  utf8 = encodeURI(utf8);
  while (i < utf8.length) {
    const byte: number = utf8.charCodeAt(i++);
    if (byte === 37) {
      bytes.push(parseInt(utf8.substr(i, 2), 16));
      i += 2;
    } else {
      bytes.push(byte);
    }
  }

  const array: Uint8Array = new Uint8Array(bytes);
  const buffer: ArrayBuffer = array.buffer;
  return buffer;
}

export function convertBufferToHex(buffer: ArrayBuffer): string {
  const array: Uint8Array = new Uint8Array(buffer);
  const HEX_CHARS: string = "0123456789abcdef";
  const bytes: string[] = [];
  for (let i = 0; i < array.length; i++) {
    const byte = array[i];
    bytes.push(HEX_CHARS[(byte & 0xf0) >> 4] + HEX_CHARS[byte & 0x0f]);
  }
  const hex: string = bytes.join("");
  return hex;
}

export function convertHexToBuffer(hex: string): ArrayBuffer {
  const bytes: number[] = [];

  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }

  const array: Uint8Array = new Uint8Array(bytes);
  const buffer: ArrayBuffer = array.buffer;
  return buffer;
}

export function payloadId(): number {
  const datePart: number = new Date().getTime() * Math.pow(10, 3);
  const extraPart: number = Math.floor(Math.random() * Math.pow(10, 3));
  const id: number = datePart + extraPart;
  return id;
}

export function uuid(): string {
  const result: string = ((a?: any, b?: any) => {
    for (
      b = a = "";
      a++ < 36;
      b +=
        (a * 51) & 52
          ? (a ^ 15 ? 8 ^ (Math.random() * (a ^ 20 ? 16 : 4)) : 4).toString(16)
          : "-"
    ) {
      // empty
    }
    return b;
  })();
  return result;
}

export function getMeta(): IClientMeta {
  function getIcons(): string[] {
    const links: HTMLCollectionOf<
      HTMLLinkElement
    > = document.getElementsByTagName("link");
    const icons: string[] = [];

    for (let i = 0; i < links.length; i++) {
      const link: HTMLLinkElement = links[i];

      const rel: string | null = link.getAttribute("rel");
      if (rel) {
        if (rel.toLowerCase().indexOf("icon") > -1) {
          const href: string | null = link.getAttribute("href");

          if (href) {
            if (
              href.toLowerCase().indexOf("https:") === -1 &&
              href.toLowerCase().indexOf("http:") === -1 &&
              href.indexOf("//") !== 0
            ) {
              let absoluteHref: string =
                window.location.protocol + "//" + window.location.host;

              if (href.indexOf("/") === 0) {
                absoluteHref += href;
              } else {
                const path: string[] = window.location.pathname.split("/");
                path.pop();
                const finalPath: string = path.join("/");
                absoluteHref += finalPath + "/" + href;
              }

              icons.push(absoluteHref);
            } else if (href.indexOf("//") === 0) {
              const absoluteUrl: string = window.location.protocol + href;

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

  function getMetaOfAny(...args: string[]): string {
    const metaTags: HTMLCollectionOf<
      HTMLMetaElement
    > = document.getElementsByTagName("meta");

    for (let i = 0; i < metaTags.length; i++) {
      const tag: HTMLMetaElement = metaTags[i];
      const attributes: Array<string | null> = ["itemprop", "property", "name"]
        .map(target => tag.getAttribute(target))
        .filter(attr => {
          if (attr) {
            args.includes(attr);
          }
        });

      if (attributes.length && attributes) {
        const content: string | null = tag.getAttribute("content");
        if (content) {
          return content;
        }
      }
    }

    return "";
  }

  function getName(): string {
    let name: string = getMetaOfAny(
      "name",
      "og:site_name",
      "og:title",
      "twitter:title"
    );

    if (!name) {
      name = document.title;
    }

    return name;
  }

  function getDescription(): string {
    const description: string = getMetaOfAny(
      "description",
      "og:description",
      "twitter:description",
      "keywords"
    );

    return description;
  }

  const name: string = getName();
  const description: string = getDescription();
  const ssl: boolean = window.location.href.startsWith("https");
  const url: string = window.location.origin;
  const icons: string[] = getIcons();

  const meta: IClientMeta = {
    description,
    url,
    icons,
    name,
    ssl
  };

  return meta;
}

export function parseWalletConnectUri(str: string): IParseURIResult {
  const pathStart: number = str.indexOf(":");

  const pathEnd: number | undefined =
    str.indexOf("?") !== -1 ? str.indexOf("?") : undefined;

  const protocol: string = str.substring(0, pathStart);

  const path: string = str.substring(pathStart + 1, pathEnd);

  function parseRequiredParams(path: string): IRequiredParamsResult {
    const separator = "@";

    const values = path.split(separator);

    const requiredParams = {
      handshakeTopic: values[0],
      version: parseInt(values[1], 10)
    };

    return requiredParams;
  }

  const requiredParams: IRequiredParamsResult = parseRequiredParams(path);

  const queryString: string =
    typeof pathEnd !== "undefined" ? str.substr(pathEnd) : "";

  function parseQueryParams(queryString: string): IQueryParamsResult {
    const parameters = {
      node: "",
      key: ""
    };

    const pairs = (queryString[0] === "?"
      ? queryString.substr(1)
      : queryString
    ).split("&");

    for (let i = 0; i < pairs.length; i++) {
      const keyArr: string[] = pairs[i].match(/\w+(?==)/i) || [];
      const valueArr: string[] = pairs[i].match(/=.+/i) || [];
      if (keyArr[0]) {
        parameters[decodeURIComponent(keyArr[0])] = decodeURIComponent(
          valueArr[0].substr(1)
        );
      }
    }
    return parameters;
  }

  const queryParams: IQueryParamsResult = parseQueryParams(queryString);

  const result: IParseURIResult = {
    protocol,
    ...requiredParams,
    ...queryParams
  };

  return result;
}

export function isRpcRequest(object: any): object is IFullRpcRequest {
  return "method" in object;
}

export function isRpcResponse(object: any): object is IRpcResponse {
  return "result" in object;
}

export function isInternalEvent(object: any): object is IInternalEvent {
  return "event" in object;
}
