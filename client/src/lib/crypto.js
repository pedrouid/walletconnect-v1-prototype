import crypto from "isomorphic-webcrypto";
import {
  convertBufferToHex,
  convertUtf8ToBuffer,
  concatBuffers,
  convertHexToBuffer,
  convertBufferToUtf8,
  stringifyJSON,
  parseJSON
} from "./utils";

const AES_ALGORITHM = "AES-CBC";
const HMAC_ALGORITHM = "SHA-256";

export async function exportKey(cryptoKey) {
  const buffer = await crypto.subtle.exportKey("raw", cryptoKey);
  return buffer;
}

export async function importKey(buffer, type = AES_ALGORITHM) {
  const opts =
    type === AES_ALGORITHM
      ? { name: AES_ALGORITHM }
      : {
          name: "HMAC",
          hash: { name: HMAC_ALGORITHM }
        };
  const actions =
    type === AES_ALGORITHM ? ["encrypt", "decrypt"] : ["sign", "verify"];
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    buffer,
    opts,
    true,
    actions
  );
  return cryptoKey;
}

export async function generateKey(s = 256) {
  const cryptoKey = await crypto.subtle.generateKey(
    {
      name: AES_ALGORITHM,
      length: s
    },
    true,
    ["encrypt", "decrypt"]
  );
  const key = await exportKey(cryptoKey);
  return key;
}

export async function createHmac(data, key) {
  const cryptoKey = await importKey(key, "HMAC");
  const signature = await crypto.subtle.sign(
    {
      name: "HMAC"
    },
    cryptoKey,
    data
  );
  return signature;
}

export async function verifyHmac(payload, key) {
  const cipherText = convertHexToBuffer(payload.data);
  const iv = convertHexToBuffer(payload.iv);
  const hmac = convertHexToBuffer(payload.hmac);
  const hmacHex = convertBufferToHex(hmac);

  const unsigned = concatBuffers(cipherText, iv);
  const chmac = await createHmac(unsigned, key);
  const chmacHex = convertBufferToHex(chmac);

  if (hmacHex === chmacHex) {
    return true;
  }

  return false;
}

export async function aesCbcEncrypt(data, key, iv) {
  const cryptoKey = await importKey(key, AES_ALGORITHM);
  const result = await crypto.subtle.encrypt(
    {
      name: AES_ALGORITHM,
      iv: iv
    },
    cryptoKey,
    data
  );
  return result;
}

export async function aesCbcDecrypt(data, key, iv) {
  const cryptoKey = await importKey(key, AES_ALGORITHM);
  const result = await window.crypto.subtle.decrypt(
    {
      name: AES_ALGORITHM,
      iv: iv
    },
    cryptoKey,
    data
  );
  return result;
}

export async function encrypt(data, key) {
  if (!key) {
    throw new Error("Missing key: required for encryption");
  }

  const iv = await generateKey(128);

  const ivHex = convertBufferToHex(iv);

  const contentString = stringifyJSON(data);

  const content = convertUtf8ToBuffer(contentString);
  const cipherText = await aesCbcEncrypt(content, key, iv);
  const cipherTextHex = convertBufferToHex(cipherText);

  const unsigned = concatBuffers(cipherText, iv);
  const hmac = await createHmac(unsigned, key);
  const hmacHex = convertBufferToHex(hmac);

  return {
    data: cipherTextHex,
    hmac: hmacHex,
    iv: ivHex
  };
}

export async function decrypt(payload, key) {
  if (!key) {
    throw new Error("Missing key: required for decryption");
  }

  const verified = await verifyHmac(payload, key);

  if (!verified) {
    return null;
  }

  const cipherText = convertHexToBuffer(payload.data);
  const iv = convertHexToBuffer(payload.iv);

  const buffer = await aesCbcDecrypt(cipherText, key, iv);

  const utf8 = convertBufferToUtf8(buffer);

  const data = parseJSON(utf8);

  return data;
}
