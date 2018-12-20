export interface IEncryptionPayload {
  data: string;
  hmac: string;
  iv: string;
}

export interface ISocketMessage {
  topic: string;
  payload: string;
}

export interface IJSONRPCRequest {
  id: number;
  jsonrpc: string;
  method: string;
  params: any[];
}

export interface IClientMeta {
  description: string;
  url: string;
  icons: string[];
  name: string;
  ssl: boolean;
}

export interface IEventEmitter {
  method: string;
  callback: (error: Error | null, request: any | null) => void;
}

export interface IRequiredParamsResult {
  handshakeTopic: string;
  version: number;
}

export interface IQueryParamsResult {
  node: string;
  key: string;
}

export interface IParseURIResult {
  protocol: string;
  handshakeTopic: string;
  version: number;
  node: string;
  key: string;
}

export interface IWalletConnectOptions {
  node?: string;
  uri?: string;
}

export interface IWalletConnectSession {
  accounts: string[];
  chainId: number | null;
  node: string;
  key: string;
  clientId: string;
  clientMeta: IClientMeta;
  peerId: string | null;
  peerMeta: IClientMeta | null;
  handshakeTopic: string | null;
}

export interface IWalletConnectJSON {
  accounts: string[];
  chainId: number | null;
  node: string;
  peerMeta: IClientMeta | null;
  uri: string;
}
