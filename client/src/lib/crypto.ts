import { IEncryptionPayload } from "./types";

import {
  concatBuffers,
  convertBufferToHex,
  convertBufferToUtf8,
  convertHexToBuffer,
  convertUtf8ToBuffer,
  parseJSON,
  stringifyJSON
} from "./utils";

const AES_ALGORITHM: string = "AES-CBC";
const HMAC_ALGORITHM: string = "SHA-256";

export async function exportKey(cryptoKey: CryptoKey): Promise<ArrayBuffer> {
  const buffer: ArrayBuffer = await window.crypto.subtle.exportKey(
    "raw",
    cryptoKey
  );
  return buffer;
}

export async function importKey(
  buffer: ArrayBuffer,
  type: string = AES_ALGORITHM
): Promise<CryptoKey> {
  const algo: AesKeyAlgorithm | HmacImportParams =
    type === AES_ALGORITHM
      ? { length: 256, name: AES_ALGORITHM }
      : {
          hash: { name: HMAC_ALGORITHM },
          name: "HMAC"
        };
  const usages: string[] =
    type === AES_ALGORITHM ? ["encrypt", "decrypt"] : ["sign", "verify"];
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    buffer,
    algo,
    true,
    usages
  );
  return cryptoKey;
}

export async function generateKey(s: number = 256): Promise<ArrayBuffer> {
  const cryptoKey = await window.crypto.subtle.generateKey(
    {
      length: s,
      name: AES_ALGORITHM
    },
    true,
    ["encrypt", "decrypt"]
  );
  const key: ArrayBuffer = await exportKey(cryptoKey);
  return key;
}

export async function createHmac(
  data: ArrayBuffer,
  key: ArrayBuffer
): Promise<ArrayBuffer> {
  const cryptoKey: CryptoKey = await importKey(key, "HMAC");
  const signature = await window.crypto.subtle.sign(
    {
      length: 256,
      name: "HMAC"
    },
    cryptoKey,
    data
  );
  return signature;
}

export async function verifyHmac(
  payload: IEncryptionPayload,
  key: ArrayBuffer
): Promise<boolean> {
  const cipherText: ArrayBuffer = convertHexToBuffer(payload.data);
  const iv: ArrayBuffer = convertHexToBuffer(payload.iv);
  const hmac: ArrayBuffer = convertHexToBuffer(payload.hmac);
  const hmacHex: string = convertBufferToHex(hmac);

  const unsigned: ArrayBuffer = concatBuffers(cipherText, iv);
  const chmac: ArrayBuffer = await createHmac(unsigned, key);
  const chmacHex: string = convertBufferToHex(chmac);

  if (hmacHex === chmacHex) {
    return true;
  }

  return false;
}

export async function aesCbcEncrypt(
  data: ArrayBuffer,
  key: ArrayBuffer,
  iv: ArrayBuffer
): Promise<ArrayBuffer> {
  const cryptoKey: CryptoKey = await importKey(key, AES_ALGORITHM);
  const result: ArrayBuffer = await window.crypto.subtle.encrypt(
    {
      iv,
      name: AES_ALGORITHM
    },
    cryptoKey,
    data
  );
  return result;
}

export async function aesCbcDecrypt(
  data: ArrayBuffer,
  key: ArrayBuffer,
  iv: ArrayBuffer
): Promise<ArrayBuffer> {
  const cryptoKey: CryptoKey = await importKey(key, AES_ALGORITHM);
  const result: ArrayBuffer = await window.window.crypto.subtle.decrypt(
    {
      iv,
      name: AES_ALGORITHM
    },
    cryptoKey,
    data
  );
  return result;
}

export async function encrypt(data: object, key: ArrayBuffer): Promise<any> {
  if (!key) {
    throw new Error("Missing key: required for encryption");
  }

  const iv: ArrayBuffer = await generateKey(128);

  const ivHex: string = convertBufferToHex(iv);

  const contentString: string = stringifyJSON(data);

  const content: ArrayBuffer = convertUtf8ToBuffer(contentString);
  const cipherText: ArrayBuffer = await aesCbcEncrypt(content, key, iv);
  const cipherTextHex: string = convertBufferToHex(cipherText);

  const unsigned: ArrayBuffer = concatBuffers(cipherText, iv);
  const hmac: ArrayBuffer = await createHmac(unsigned, key);
  const hmacHex: string = convertBufferToHex(hmac);

  return {
    data: cipherTextHex,
    hmac: hmacHex,
    iv: ivHex
  };
}

export async function decrypt(
  payload: IEncryptionPayload,
  key: ArrayBuffer
): Promise<any> {
  if (!key) {
    throw new Error("Missing key: required for decryption");
  }

  const verified: boolean = await verifyHmac(payload, key);

  if (!verified) {
    return null;
  }

  const cipherText: ArrayBuffer = convertHexToBuffer(payload.data);
  const iv: ArrayBuffer = convertHexToBuffer(payload.iv);

  const buffer: ArrayBuffer = await aesCbcDecrypt(cipherText, key, iv);

  const utf8: string = convertBufferToUtf8(buffer);

  const data: object = parseJSON(utf8);

  return data;
}
