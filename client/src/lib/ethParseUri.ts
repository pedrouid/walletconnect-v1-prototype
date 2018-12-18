function parseRequiredParams(path: string, config: any | null = null) {
  let _config = {
    erc681: {
      prefix: "pay",
      separators: ["@", "/"],
      keys: ["targetAddress", "chainId", "functionName"]
    },
    erc1328: {
      prefix: "wc",
      separators: ["@"],
      keys: ["sessionId", "version"]
    }
  };

  if (config && typeof config === "object") {
    _config = { ..._config, config };
  }

  let standard =
    Object.keys(_config).filter(key =>
      path.startsWith(_config[key].prefix)
    )[0] || "";

  if (!standard) {
    if (
      path.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
      )
    ) {
      standard = "erc1328";
    } else {
      standard = "erc681";
    }
  }

  const requiredParams = { prefix: _config[standard].prefix };

  path = path.replace(`${_config[standard].prefix}-`, "");

  const indexes: number[] = [];

  _config[standard].separators.reverse().forEach((separator, idx, arr) => {
    let fallback;
    if (idx === arr.length) {
      fallback = path.length;
    } else {
      fallback = indexes[0];
    }
    let index =
      path.indexOf(separator) && path.indexOf(separator) !== -1
        ? path.indexOf(separator)
        : fallback;
    indexes.unshift(index);
  });

  _config[standard].keys.forEach((key, idx, arr) => {
    let startIndex = idx !== 0 ? indexes[idx - 1] + 1 : 0;
    let endIndex = idx !== arr.length ? indexes[idx] : undefined;
    requiredParams[key] =
      idx !== 0 && indexes[idx - 1] === indexes[idx]
        ? ""
        : path.substr(startIndex, endIndex);
  });

  return requiredParams;
}

function parseQueryParams(queryString: string) {
  const parameters = {};

  if (!queryString) {
    return parameters;
  }

  const pairs = (queryString[0] === "?"
    ? queryString.substr(1)
    : queryString
  ).split("&");

  for (let i = 0; i < pairs.length; i++) {
    const key = pairs[i].match(/\w+(?==)/i)
      ? pairs[i].match(/\w+(?==)/i)[0]
      : null;
    const value = pairs[i].match(/=.+/i)
      ? pairs[i].match(/=.+/i)[0].substr(1)
      : "";
    if (key) {
      parameters[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  return parameters;
}

function ethParseUri(str: string) {
  if (!str || typeof str !== "string") {
    throw new Error("URI is not a string");
  }

  str = decodeURIComponent(str);

  const pathStart = str.indexOf(":");

  const pathEnd = str.indexOf("?") !== -1 ? str.indexOf("?") : undefined;

  const protocol = str.substr(0, pathStart);

  const path = str.substr(pathStart + 1, pathEnd);

  const requiredParams = parseRequiredParams(path);

  const queryString = typeof pathEnd !== "undefined" ? str.substr(pathEnd) : "";

  const queryParams = parseQueryParams(queryString);

  return { protocol, ...requiredParams, ...queryParams };
}

export default ethParseUri;
