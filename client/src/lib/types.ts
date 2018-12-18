export interface IEncryptionPayload {
  data: string;
  hmac: string;
  iv: string;
}

export interface ISocketPayload {
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
  host: string;
  icons: string[];
  name: string;
  ssl: boolean;
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
  id: string;
  meta: IClientMeta | null;
  peerId: string | null;
  peerMeta: IClientMeta | null;
}

export interface IWalletConnectJSON {
  accounts: string[];
  chainId: number | null;
  node: string;
  peerMeta: IClientMeta | null;
  uri: string;
}
