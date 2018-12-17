export function concatBuffers(...args) {
  let hex = args.map(b => convertBufferToHex(b)).join("");
  let result = convertHexToBuffer(hex);
  return result;
}

export function convertBufferToUtf8(buffer) {
  const array = new Uint8Array(buffer);
  let chars = [];
  let i = 0;

  while (i < array.length) {
    let c = array[i];

    if (c < 128) {
      chars.push(String.fromCharCode(c));
      i++;
    } else if (c > 191 && c < 224) {
      chars.push(
        String.fromCharCode(((c & 0x1f) << 6) | (array[i + 1] & 0x3f))
      );
      i += 2;
    } else {
      chars.push(
        String.fromCharCode(
          ((c & 0x0f) << 12) |
            ((array[i + 1] & 0x3f) << 6) |
            (array[i + 2] & 0x3f)
        )
      );
      i += 3;
    }
  }

  const utf8 = chars.join("");
  return utf8;
}

export function convertUtf8ToBuffer(utf8) {
  let bytes = [];

  let i = 0;
  utf8 = encodeURI(utf8);
  while (i < utf8.length) {
    let char = utf8.charCodeAt(i++);
    if (char === 37) {
      bytes.push(parseInt(utf8.substr(i, 2), 16));
      i += 2;
    } else {
      bytes.push(char);
    }
  }

  const array = new Uint8Array(bytes);
  const buffer = array.buffer;
  return buffer;
}

export function convertBufferToHex(buffer) {
  const array = new Uint8Array(buffer);
  const HEX_CHARS = "0123456789abcdef";
  var chars = [];
  for (var i = 0; i < array.length; i++) {
    var v = array[i];
    chars.push(HEX_CHARS[(v & 0xf0) >> 4] + HEX_CHARS[v & 0x0f]);
  }
  const hex = chars.join("");
  return hex;
}

export function convertHexToBuffer(hex) {
  let bytes = [];

  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }

  const array = new Uint8Array(bytes);
  const buffer = array.buffer;
  return buffer;
}

export function payloadId() {
  var datePart = new Date().getTime() * Math.pow(10, 3);
  var extraPart = Math.floor(Math.random() * Math.pow(10, 3));
  return datePart + extraPart;
}

export function uuid(a) {
  return a
    ? (a ^ ((Math.random() * 16) >> (a / 4))).toString(16)
    : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, uuid);
}

export function getMeta() {
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

export function stringifyJSON(data) {
  return JSON.stringify(data);
}

export function parseJSON(string) {
  let result = null;
  try {
    result = JSON.parse(string);
  } catch (error) {
    throw new Error(`Failed to parse invalid JSON`);
  }
  return result;
}
